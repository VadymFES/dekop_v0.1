/**
 * Reconcile Pending Orders Cron Tests
 * Verifies the 15-minute reconciliation job that polls LiqPay for pending
 * orders when the server_url webhook failed to arrive.
 */

import { GET } from '@/app/api/cron/reconcile-pending-orders/route'

jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}))

jest.mock('@/app/lib/services/liqpay-service', () => ({
  checkLiqPayPaymentStatus: jest.fn(),
  mapLiqPayStatus: jest.requireActual('@/app/lib/services/liqpay-service').mapLiqPayStatus,
}))

jest.mock('@/app/lib/services/email-service', () => ({
  sendOrderConfirmationEmail: jest.fn(),
}))

const { sql } = require('@vercel/postgres')
const { checkLiqPayPaymentStatus } = require('@/app/lib/services/liqpay-service')
const { sendOrderConfirmationEmail } = require('@/app/lib/services/email-service')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(secret = 'test-cron-secret') {
  return new Request('http://localhost/api/cron/reconcile-pending-orders', {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  })
}

const pendingOrder = {
  id: 'order-uuid-1',
  order_number: '#001',
  user_email: 'buyer@example.com',
  user_name: 'Ivan',
  user_surname: 'Franko',
}

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('GET /api/cron/reconcile-pending-orders', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-cron-secret',
      LIQPAY_PUBLIC_KEY: 'pub',
      LIQPAY_PRIVATE_KEY: 'prv',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ─── Auth ──────────────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('returns 401 with wrong secret', async () => {
      const res = await GET(makeRequest('wrong-secret'))
      expect(res.status).toBe(401)
    })

    it('returns 401 with no authorization header', async () => {
      const req = new Request('http://localhost/api/cron/reconcile-pending-orders')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('proceeds with correct secret', async () => {
      sql.mockResolvedValueOnce({ rows: [] })
      const res = await GET(makeRequest('test-cron-secret'))
      expect(res.status).toBe(200)
    })
  })

  // ─── Empty queue ──────────────────────────────────────────────────────────

  describe('Empty queue', () => {
    it('returns success with zero checked when no pending orders', async () => {
      sql.mockResolvedValueOnce({ rows: [] })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.checked).toBe(0)
      expect(body.results).toEqual([])
    })
  })

  // ─── Paid order recovery ──────────────────────────────────────────────────

  describe('Paid order recovery', () => {
    it('confirms pending order when LiqPay returns success', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...pendingOrder, items: [], total_amount: 1000 }] })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'success', transaction_id: 'txn-abc' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0]).toEqual({ orderId: pendingOrder.id, result: 'confirmed' })

      const updateCall = sql.mock.calls[1][0].join('')
      expect(updateCall).toContain("payment_status = 'paid'")
      expect(updateCall).toContain("order_status = 'confirmed'")
    })

    it('sends confirmation email after marking as paid', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            ...pendingOrder,
            items: [{ product_name: 'Chair', quantity: 1, unit_price: 1000, total_price: 1000 }],
            total_amount: 1000,
          }],
        })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'success', transaction_id: 'txn-xyz' })

      await GET(makeRequest())

      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: pendingOrder.user_email })
      )
    })

    it('treats sandbox status as paid', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...pendingOrder, items: [] }] })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'sandbox', transaction_id: 'txn-sb' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0].result).toBe('confirmed')
    })

    it('still returns success when email sending fails after confirming order', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...pendingOrder, items: [] }] })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'success', transaction_id: 'txn-efail' })
      sendOrderConfirmationEmail.mockRejectedValue(new Error('SMTP down'))

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.results[0].result).toBe('confirmed')
    })
  })

  // ─── Failed order handling ────────────────────────────────────────────────

  describe('Failed order handling', () => {
    it('marks order failed when LiqPay returns failure', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'failure', transaction_id: 'txn-fail' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0]).toEqual({ orderId: pendingOrder.id, result: 'failed' })
      expect(sql.mock.calls[1][0].join('')).toContain("payment_status = 'failed'")
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled()
    })

    it('marks order failed on error status', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'error' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0].result).toBe('failed')
    })
  })

  // ─── Still-pending orders ─────────────────────────────────────────────────

  describe('Still-pending orders', () => {
    it('reports still_pending when LiqPay returns processing', async () => {
      sql.mockResolvedValueOnce({ rows: [pendingOrder] })
      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'processing' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0]).toEqual({ orderId: pendingOrder.id, result: 'still_pending' })
      expect(sql).toHaveBeenCalledTimes(1) // no update query
    })

    it('reports still_pending on wait_accept', async () => {
      sql.mockResolvedValueOnce({ rows: [pendingOrder] })
      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'wait_accept' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0].result).toBe('still_pending')
    })
  })

  // ─── No status from LiqPay ────────────────────────────────────────────────

  describe('No status from LiqPay', () => {
    it('reports no_status when LiqPay returns null', async () => {
      sql.mockResolvedValueOnce({ rows: [pendingOrder] })
      checkLiqPayPaymentStatus.mockResolvedValue(null)

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0]).toEqual({ orderId: pendingOrder.id, result: 'no_status' })
    })

    it('reports no_status when response lacks status field', async () => {
      sql.mockResolvedValueOnce({ rows: [pendingOrder] })
      checkLiqPayPaymentStatus.mockResolvedValue({ order_id: pendingOrder.id })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.results[0].result).toBe('no_status')
    })
  })

  // ─── LiqPay API errors ────────────────────────────────────────────────────

  describe('LiqPay API errors', () => {
    it('records error result and continues to next order', async () => {
      const order2 = { ...pendingOrder, id: 'order-uuid-2', order_number: '#002' }
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder, order2] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update for order2

      checkLiqPayPaymentStatus
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'failure' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.checked).toBe(2)
      expect(body.results[0]).toEqual({ orderId: pendingOrder.id, result: 'error' })
      expect(body.results[1]).toEqual({ orderId: order2.id, result: 'failed' })
    })
  })

  // ─── Multiple orders ──────────────────────────────────────────────────────

  describe('Multiple orders in one run', () => {
    it('returns correct tally for mixed outcomes', async () => {
      const orders = [
        { ...pendingOrder, id: 'o1' },
        { ...pendingOrder, id: 'o2' },
        { ...pendingOrder, id: 'o3' },
      ]

      sql
        .mockResolvedValueOnce({ rows: orders })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update o1 paid
        .mockResolvedValueOnce({ rows: [{ ...pendingOrder, id: 'o1', items: [] }] }) // email query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update o2 failed

      checkLiqPayPaymentStatus
        .mockResolvedValueOnce({ status: 'success', transaction_id: 't1' })
        .mockResolvedValueOnce({ status: 'failure', transaction_id: 't2' })
        .mockResolvedValueOnce({ status: 'processing' })

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.checked).toBe(3)
      expect(body.results.map((r: any) => r.result)).toEqual(['confirmed', 'failed', 'still_pending'])
    })
  })

  // ─── Idempotency guard ────────────────────────────────────────────────────

  describe('Idempotency', () => {
    it('uses WHERE payment_status = pending guard to avoid double-confirming', async () => {
      sql
        .mockResolvedValueOnce({ rows: [pendingOrder] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })

      checkLiqPayPaymentStatus.mockResolvedValue({ status: 'success', transaction_id: 'txn-idem' })

      await GET(makeRequest())

      const updateCall = sql.mock.calls[1][0].join('')
      expect(updateCall).toContain("AND payment_status = 'pending'")
    })
  })
})
