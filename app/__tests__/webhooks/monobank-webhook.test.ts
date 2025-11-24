/**
 * Monobank Webhook Integration Tests
 * Tests RSA signature verification and all 4 security layers
 */

import crypto from 'crypto'
import { POST } from '@/app/api/webhooks/monobank/route'
import { createTestKeyPair } from '../test-utils'
import * as webhookSecurity from '@/app/lib/webhook-security'

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

jest.mock('@/app/lib/services/email-service', () => ({
  sendOrderConfirmationEmail: jest.fn(),
}))

const { sql } = require('@vercel/postgres')
const { headers } = require('next/headers')
const { sendOrderConfirmationEmail } = require('@/app/lib/services/email-service')

describe('Monobank Webhook Integration', () => {
  const originalEnv = process.env
  let testKeyPair: { publicKey: string; privateKey: string }

  beforeAll(() => {
    // Generate test RSA key pair
    testKeyPair = createTestKeyPair()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      MONOBANK_PUBLIC_KEY: testKeyPair.publicKey,
      MONOBANK_TOKEN: 'test_monobank_token',
      DISABLE_WEBHOOK_IP_VALIDATION: 'true',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  /**
   * Helper to create signed webhook request
   */
  function createMonobankWebhookRequest(
    payload: any,
    options: { sign?: boolean; ip?: string; customSignature?: string } = {}
  ) {
    const { sign = true, ip = '127.0.0.1', customSignature } = options

    const body = JSON.stringify(payload)

    // Generate RSA signature
    let signature = ''
    if (sign && !customSignature) {
      const signer = crypto.createSign('SHA256')
      signer.update(body)
      signer.end()
      signature = signer.sign(testKeyPair.privateKey, 'base64')
    } else if (customSignature) {
      signature = customSignature
    }

    const request = new Request('http://localhost:3000/api/webhooks/monobank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sign': signature,
        'x-forwarded-for': ip,
      },
      body,
    })

    // Mock headers() function
    headers.mockResolvedValue({
      get: (name: string) => {
        if (name === 'x-sign') return signature
        return null
      },
    })

    return request
  }

  describe('Security Layer 1: IP Validation', () => {
    it('should accept webhook when IP validation is disabled', async () => {
      const payload = {
        invoiceId: 'inv_123',
        status: 'success',
        amount: 100000,
        ccy: 980,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        reference: 'order-123',
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload, { ip: '1.2.3.4' })
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.received).toBe(true)
    })

    it('should reject webhook from unauthorized IP when validation enabled', async () => {
      process.env.DISABLE_WEBHOOK_IP_VALIDATION = 'false'

      const payload = {
        invoiceId: 'inv_123',
        status: 'success',
        reference: 'order-123',
      }

      const request = createMonobankWebhookRequest(payload, { ip: '192.168.1.1' })
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Unauthorized IP')
    })
  })

  describe('Security Layer 2: RSA Signature Verification', () => {
    it('should accept webhook with valid RSA signature', async () => {
      const payload = {
        invoiceId: 'inv_valid_sig',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-valid',
        modifiedDate: new Date().toISOString(),
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        invoiceId: 'inv_invalid',
        status: 'success',
        reference: 'order-invalid',
      }

      const request = createMonobankWebhookRequest(payload, {
        customSignature: 'invalid_signature_base64',
      })
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('signature verification failed')
    })

    it('should reject webhook with missing X-Sign header', async () => {
      const payload = {
        invoiceId: 'inv_no_sig',
        status: 'success',
        reference: 'order-no-sig',
      }

      const body = JSON.stringify(payload)

      const request = new Request('http://localhost:3000/api/webhooks/monobank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      headers.mockResolvedValue({
        get: () => null,
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing x-sign header')
    })

    it('should reject tampered webhook data', async () => {
      const originalPayload = {
        invoiceId: 'inv_tamper',
        status: 'success',
        amount: 100000,
        reference: 'order-original',
      }

      // Sign original payload
      const originalBody = JSON.stringify(originalPayload)
      const signer = crypto.createSign('SHA256')
      signer.update(originalBody)
      signer.end()
      const signature = signer.sign(testKeyPair.privateKey, 'base64')

      // Create tampered payload
      const tamperedPayload = {
        ...originalPayload,
        amount: 1000000, // Changed amount!
      }

      const request = new Request('http://localhost:3000/api/webhooks/monobank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sign': signature,
        },
        body: JSON.stringify(tamperedPayload),
      })

      headers.mockResolvedValue({
        get: (name: string) => (name === 'x-sign' ? signature : null),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('signature verification failed')
    })

    it('should verify signature with special characters in payload', async () => {
      const payload = {
        invoiceId: 'inv_special',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-special',
        destination: 'Test <>&"\' special chars',
        comment: 'Українська мова 🎉',
        modifiedDate: new Date().toISOString(),
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Security Layer 3: Replay Attack Prevention', () => {
    it('should reject duplicate webhook', async () => {
      const payload = {
        invoiceId: 'inv_duplicate',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-duplicate',
        modifiedDate: new Date().toISOString(),
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(false)

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(409)
      expect(result.error).toContain('Duplicate webhook')
    })

    it('should accept webhook with unique invoice ID', async () => {
      const payload = {
        invoiceId: 'inv_unique_' + Date.now(),
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-unique',
        modifiedDate: new Date().toISOString(),
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should call isWebhookUnique with correct parameters', async () => {
      const payload = {
        invoiceId: 'inv_check_params',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-params',
        modifiedDate: new Date().toISOString(),
      }

      const uniqueCheck = jest
        .spyOn(webhookSecurity, 'isWebhookUnique')
        .mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      await POST(request)

      expect(uniqueCheck).toHaveBeenCalledWith(
        'monobank_inv_check_params',
        'monobank',
        3600,
        expect.objectContaining({
          invoiceId: 'inv_check_params',
        })
      )
    })
  })

  describe('Security Layer 4: Timestamp Validation', () => {
    it('should reject webhook with old timestamp', async () => {
      const oldDate = new Date(Date.now() - 11 * 60 * 1000).toISOString()

      const payload = {
        invoiceId: 'inv_old',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-old',
        modifiedDate: oldDate,
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('timestamp too old')
    })

    it('should accept webhook with recent timestamp', async () => {
      const recentDate = new Date(Date.now() - 60 * 1000).toISOString()

      const payload = {
        invoiceId: 'inv_recent',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-recent',
        modifiedDate: recentDate,
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept webhook without timestamp', async () => {
      const payload = {
        invoiceId: 'inv_no_timestamp',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-no-timestamp',
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Payment Status Handling', () => {
    beforeEach(() => {
      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
    })

    it('should handle successful payment', async () => {
      const payload = {
        invoiceId: 'inv_success',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-success',
        modifiedDate: new Date().toISOString(),
      }

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'order-success',
              order_number: '#1234567890',
              user_email: 'test@example.com',
              user_name: 'John',
              user_surname: 'Doe',
              items: [],
            },
          ],
        })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.received).toBe(true)

      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'paid'/),
        ])
      )

      expect(sendOrderConfirmationEmail).toHaveBeenCalled()
    })

    it('should handle failed payment', async () => {
      const payload = {
        invoiceId: 'inv_failed',
        status: 'failure',
        amount: 100000,
        ccy: 980,
        reference: 'order-failed',
        modifiedDate: new Date().toISOString(),
      }

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)

      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'failed'/),
        ])
      )

      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled()
    })

    it('should handle expired payment as failed', async () => {
      const payload = {
        invoiceId: 'inv_expired',
        status: 'expired',
        amount: 100000,
        ccy: 980,
        reference: 'order-expired',
        modifiedDate: new Date().toISOString(),
      }

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)

      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/payment_status = 'failed'/)])
      )
    })

    it('should handle refunded payment', async () => {
      const payload = {
        invoiceId: 'inv_refunded',
        status: 'reversed',
        amount: 100000,
        ccy: 980,
        reference: 'order-refunded',
        modifiedDate: new Date().toISOString(),
      }

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)

      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/payment_status = 'refunded'/)])
      )
    })

    it('should handle pending payment statuses', async () => {
      const statuses = ['created', 'processing', 'hold']

      for (const status of statuses) {
        jest.clearAllMocks()

        const payload = {
          invoiceId: `inv_${status}`,
          status,
          amount: 100000,
          ccy: 980,
          reference: `order-${status}`,
          modifiedDate: new Date().toISOString(),
        }

        sql.mockResolvedValue({ rows: [], rowCount: 1 })
        jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)

        const request = createMonobankWebhookRequest(payload)
        const response = await POST(request)

        expect(response.status).toBe(200)

        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringMatching(/payment_status = 'pending'/)])
        )
      }
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
    })

    it('should return error when reference (order ID) is missing', async () => {
      const payload = {
        invoiceId: 'inv_no_ref',
        status: 'success',
        amount: 100000,
        ccy: 980,
        modifiedDate: new Date().toISOString(),
        // reference is missing!
      }

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing order reference')
    })

    it('should handle database errors gracefully', async () => {
      const payload = {
        invoiceId: 'inv_db_error',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-db-error',
        modifiedDate: new Date().toISOString(),
      }

      sql.mockRejectedValue(new Error('Database connection lost'))

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Webhook handler failed')
      expect(result.details).toContain('Database connection lost')
    })

    it('should continue even if email sending fails', async () => {
      const payload = {
        invoiceId: 'inv_email_error',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-email-error',
        modifiedDate: new Date().toISOString(),
      }

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'order-email-error',
              order_number: '#1234567890',
              user_email: 'test@example.com',
              user_name: 'John',
              user_surname: 'Doe',
              items: [],
            },
          ],
        })

      sendOrderConfirmationEmail.mockRejectedValue(new Error('Email API down'))

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle malformed JSON in payload', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/monobank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sign': 'some_signature',
        },
        body: 'not valid json{{{',
      })

      headers.mockResolvedValue({
        get: (name: string) => (name === 'x-sign' ? 'some_signature' : null),
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Webhook handler failed')
    })
  })

  describe('Response Headers', () => {
    it('should include security headers in all responses', async () => {
      const payload = {
        invoiceId: 'inv_headers',
        status: 'success',
        amount: 100000,
        ccy: 980,
        reference: 'order-headers',
        modifiedDate: new Date().toISOString(),
      }

      jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createMonobankWebhookRequest(payload)
      const response = await POST(request)

      expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
      expect(response.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate'
      )
    })
  })

  describe('Amount Handling', () => {
    it('should correctly handle amounts in kopiykas', async () => {
      const testCases = [
        { amount: 100000, description: '1000 UAH' },
        { amount: 123456, description: '1234.56 UAH' },
        { amount: 1, description: '0.01 UAH' },
      ]

      for (const testCase of testCases) {
        jest.clearAllMocks()

        const payload = {
          invoiceId: `inv_amount_${testCase.amount}`,
          status: 'success',
          amount: testCase.amount,
          ccy: 980,
          reference: `order-amount-${testCase.amount}`,
          modifiedDate: new Date().toISOString(),
        }

        jest.spyOn(webhookSecurity, 'isWebhookUnique').mockResolvedValue(true)
        sql.mockResolvedValue({ rows: [], rowCount: 1 })

        const request = createMonobankWebhookRequest(payload)
        const response = await POST(request)

        expect(response.status).toBe(200)
      }
    })
  })
})
