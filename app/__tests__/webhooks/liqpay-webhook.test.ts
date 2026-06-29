/**
 * LiqPay Webhook Integration Tests
 * Tests all security layers and payment status handling.
 *
 * Reflects the 2026-06-29 audit fix: security rejections (IP mismatch, bad
 * signature, duplicate) all return HTTP 200 so LiqPay stops retrying.
 * Timestamp validation was removed (used wrong field; deduplication covers
 * replay attacks).
 */

import crypto from 'crypto'
import { POST } from '@/app/api/webhooks/liqpay/route'

jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}))

jest.mock('@/app/lib/services/email-service', () => ({
  sendOrderConfirmationEmail: jest.fn(),
}))

jest.mock('@/app/lib/webhook-security', () => ({
  isWebhookUnique: jest.fn(),
  validateWebhookIp: jest.fn(),
}))

const { sql } = require('@vercel/postgres')
const { sendOrderConfirmationEmail } = require('@/app/lib/services/email-service')
const { isWebhookUnique, validateWebhookIp } = require('@/app/lib/webhook-security')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLiqPayWebhook(payload: object) {
  const privateKey = process.env.LIQPAY_PRIVATE_KEY ?? ''
  const data = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = crypto
    .createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64')
  return { data, signature }
}

function makeWebhookRequest(data: string, signature: string, ip = '127.0.0.1') {
  const form = new FormData()
  form.append('data', data)
  form.append('signature', signature)
  return new Request('http://localhost:3000/api/webhooks/liqpay', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: form,
  })
}

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('LiqPay Webhook', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      LIQPAY_PUBLIC_KEY: 'test_public_key',
      LIQPAY_PRIVATE_KEY: 'test_private_key',
      DISABLE_WEBHOOK_IP_VALIDATION: 'true',
      NODE_ENV: 'test',
    }
    validateWebhookIp.mockReturnValue({ valid: true })
    isWebhookUnique.mockResolvedValue(true)
    sql.mockResolvedValue({ rows: [], rowCount: 1 })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ─── Layer 1: IP Validation ─────────────────────────────────────────────────

  describe('Security Layer 1 — IP Validation', () => {
    it('returns 200 (not 403) when IP is rejected, to stop LiqPay retries', async () => {
      validateWebhookIp.mockReturnValue({ valid: false, reason: 'Not in whitelist' })

      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-1',
        status: 'success',
        transaction_id: 'txn-1',
      })

      const res = await POST(makeWebhookRequest(data, signature, '1.2.3.4'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe('ok')
      expect(sql).not.toHaveBeenCalled()
    })

    it('passes through when IP validation succeeds', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-2',
        status: 'success',
        transaction_id: 'txn-2',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-2', user_email: 'a@b.com',
            user_name: 'A', user_surname: 'B',
            order_number: '#1', items: [],
          }],
        })

      const res = await POST(makeWebhookRequest(data, signature, '99.83.131.17'))
      expect(res.status).toBe(200)
    })
  })

  // ─── Layer 2: Signature Verification ───────────────────────────────────────

  describe('Security Layer 2 — Signature Verification', () => {
    it('returns 200 (not 400) for invalid signature, order not confirmed', async () => {
      const data = Buffer.from(JSON.stringify({ order_id: 'order-3', status: 'success' })).toString('base64')
      const res = await POST(makeWebhookRequest(data, 'invalid_sig'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe('ok')
      expect(sql).not.toHaveBeenCalled()
    })

    it('returns 200 (not 400) for tampered payload, order not confirmed', async () => {
      const real = makeLiqPayWebhook({ order_id: 'order-4', status: 'success', transaction_id: 'txn-4' })
      const tampered = Buffer.from(JSON.stringify({ order_id: 'OTHER', status: 'success', transaction_id: 'txn-4' })).toString('base64')

      const res = await POST(makeWebhookRequest(tampered, real.signature))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe('ok')
      expect(sql).not.toHaveBeenCalled()
    })

    it('returns 400 when data field is missing (malformed request)', async () => {
      const form = new FormData()
      form.append('signature', 'sig')
      const res = await POST(new Request('http://localhost/api/webhooks/liqpay', { method: 'POST', body: form }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when signature field is missing', async () => {
      const form = new FormData()
      form.append('data', 'somedata')
      const res = await POST(new Request('http://localhost/api/webhooks/liqpay', { method: 'POST', body: form }))
      expect(res.status).toBe(400)
    })
  })

  // ─── Layer 3: Replay Attack Prevention ─────────────────────────────────────

  describe('Security Layer 3 — Replay Attack Prevention', () => {
    it('returns 200 (not 409) for duplicate webhook, DB not touched', async () => {
      isWebhookUnique.mockResolvedValue(false)

      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-5',
        status: 'success',
        transaction_id: 'txn-dup',
      })

      const res = await POST(makeWebhookRequest(data, signature))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe('ok')
      expect(sql).not.toHaveBeenCalled()
    })

    it('deduplicates using transaction_id', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-6',
        status: 'success',
        transaction_id: 'txn-6',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      await POST(makeWebhookRequest(data, signature))

      expect(isWebhookUnique).toHaveBeenCalledWith(
        'liqpay_txn-6', 'liqpay', expect.any(Number), expect.any(Object)
      )
    })

    it('falls back to payment_id when transaction_id absent', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-7',
        status: 'success',
        payment_id: 'pay-7',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      await POST(makeWebhookRequest(data, signature))

      expect(isWebhookUnique).toHaveBeenCalledWith(
        'liqpay_pay-7', 'liqpay', expect.any(Number), expect.any(Object)
      )
    })
  })

  // ─── Timestamp validation removed ──────────────────────────────────────────

  describe('Timestamp handling — no rejection on old create_date', () => {
    it('processes webhook with create_date 15 min old without rejecting', async () => {
      const oldDate = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-old',
        status: 'success',
        transaction_id: 'txn-old',
        create_date: oldDate,
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      const res = await POST(makeWebhookRequest(data, signature))

      expect(res.status).toBe(200)
      expect(sql).toHaveBeenCalled()
    })

    it('processes webhook with create_date 1 hour old without rejecting', async () => {
      const veryOldDate = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-very-old',
        status: 'failure',
        transaction_id: 'txn-very-old',
        create_date: veryOldDate,
      })
      sql.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const res = await POST(makeWebhookRequest(data, signature))

      expect(res.status).toBe(200)
    })

    it('processes webhook with no create_date field', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-no-date',
        status: 'success',
        transaction_id: 'txn-no-date',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      const res = await POST(makeWebhookRequest(data, signature))
      expect(res.status).toBe(200)
    })
  })

  // ─── Payment Status Handling ────────────────────────────────────────────────

  describe('Payment Status Handling', () => {
    it('confirms order and sends email on success', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-ok',
        status: 'success',
        transaction_id: 'txn-ok',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'order-ok', order_number: '#001',
            user_email: 'a@b.com', user_name: 'A', user_surname: 'B',
            items: [],
          }],
        })

      const res = await POST(makeWebhookRequest(data, signature))

      expect(res.status).toBe(200)
      const updateQuery = sql.mock.calls[0][0].join('')
      expect(updateQuery).toContain('UPDATE orders')
      expect(updateQuery).toContain("payment_status = 'paid'")
      expect(sendOrderConfirmationEmail).toHaveBeenCalled()
    })

    it('treats sandbox status as paid', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-sandbox',
        status: 'sandbox',
        transaction_id: 'txn-sandbox',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-sandbox', user_email: 'x@y.com', user_name: 'X', user_surname: 'Y', order_number: '#002', items: [] }] })

      await POST(makeWebhookRequest(data, signature))

      expect(sql.mock.calls[0][0].join('')).toContain("payment_status = 'paid'")
    })

    it('marks order failed on failure, no email', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-fail', status: 'failure', transaction_id: 'txn-fail',
      })

      await POST(makeWebhookRequest(data, signature))

      expect(sql.mock.calls[0][0].join('')).toContain("payment_status = 'failed'")
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled()
    })

    it('marks order failed on error status', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-err', status: 'error', transaction_id: 'txn-err',
      })

      await POST(makeWebhookRequest(data, signature))

      expect(sql.mock.calls[0][0].join('')).toContain("payment_status = 'failed'")
    })

    it('marks order refunded on reversed', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-rev', status: 'reversed', transaction_id: 'txn-rev',
      })

      await POST(makeWebhookRequest(data, signature))

      expect(sql.mock.calls[0][0].join('')).toContain("payment_status = 'refunded'")
    })

    it('marks order pending on processing', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-proc', status: 'processing', transaction_id: 'txn-proc',
      })

      await POST(makeWebhookRequest(data, signature))

      expect(sql.mock.calls[0][0].join('')).toContain("payment_status = 'pending'")
    })
  })

  // ─── Missing order_id ──────────────────────────────────────────────────────

  describe('Missing order_id', () => {
    it('returns 400 when order_id absent from payload', async () => {
      const { data, signature } = makeLiqPayWebhook({
        status: 'success',
        transaction_id: 'txn-noid',
      })

      const res = await POST(makeWebhookRequest(data, signature))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('Missing order_id')
      expect(sql).not.toHaveBeenCalled()
    })
  })

  // ─── Resilience ────────────────────────────────────────────────────────────

  describe('Resilience', () => {
    it('returns 500 on DB error', async () => {
      sql.mockRejectedValue(new Error('DB down'))
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-dberr', status: 'success', transaction_id: 'txn-dberr',
      })

      const res = await POST(makeWebhookRequest(data, signature))
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBe('Webhook handler failed')
    })

    it('returns 200 when email fails after payment confirmed', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-mailfail', status: 'success', transaction_id: 'txn-mailfail',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'order-mailfail', user_email: 'e@f.com', user_name: 'E', user_surname: 'F', order_number: '#003', items: [] }] })
      sendOrderConfirmationEmail.mockRejectedValue(new Error('SMTP error'))

      const res = await POST(makeWebhookRequest(data, signature))
      expect(res.status).toBe(200)
    })

    it('returns 500 for malformed JSON in base64 payload', async () => {
      const privateKey = process.env.LIQPAY_PRIVATE_KEY ?? ''
      const badData = Buffer.from('not json at all').toString('base64')
      const sig = crypto.createHash('sha1').update(privateKey + badData + privateKey).digest('base64')

      const res = await POST(makeWebhookRequest(badData, sig))
      expect(res.status).toBe(500)
    })
  })

  // ─── Response Headers ───────────────────────────────────────────────────────

  describe('Response Headers', () => {
    it('includes security headers on 200 success', async () => {
      const { data, signature } = makeLiqPayWebhook({
        order_id: 'order-hdr', status: 'success', transaction_id: 'txn-hdr',
      })
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      const res = await POST(makeWebhookRequest(data, signature))

      expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
    })

    it('includes security headers on 200 silent-reject (IP fail)', async () => {
      validateWebhookIp.mockReturnValue({ valid: false, reason: 'blocked' })
      const { data, signature } = makeLiqPayWebhook({ order_id: 'x', status: 'success', transaction_id: 'y' })

      const res = await POST(makeWebhookRequest(data, signature))

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
    })
  })
})
