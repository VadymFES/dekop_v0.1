/**
 * LiqPay Webhook Integration Tests
 * Tests all 4 security layers and payment status handling
 */

import crypto from 'crypto'
import { POST } from '@/app/api/webhooks/liqpay/route'
import { createMockRequest } from '../test-utils'

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}))

jest.mock('@/app/lib/services/email-service', () => ({
  sendOrderConfirmationEmail: jest.fn(),
}))

jest.mock('@/app/lib/webhook-security', () => ({
  isWebhookUnique: jest.fn(),
  validateWebhookIp: jest.fn(),
  validateWebhookTimestamp: jest.fn(),
}))

const { sql } = require('@vercel/postgres')
const { sendOrderConfirmationEmail } = require('@/app/lib/services/email-service')
const {
  isWebhookUnique,
  validateWebhookIp,
  validateWebhookTimestamp,
} = require('@/app/lib/webhook-security')

describe('LiqPay Webhook Integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks() // Restore all spies
    process.env = {
      ...originalEnv,
      LIQPAY_PUBLIC_KEY: 'test_public_key',
      LIQPAY_PRIVATE_KEY: 'test_private_key',
      DISABLE_WEBHOOK_IP_VALIDATION: 'true',
    }

    // Set default mock return values
    validateWebhookIp.mockReturnValue({ valid: true, reason: 'Test mode' })
    validateWebhookTimestamp.mockReturnValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks() // Clean up spies after each test
  })

  /**
   * Helper to create valid LiqPay webhook data
   */
  function createLiqPayWebhookData(payload: any) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64')
    const privateKey = process.env.LIQPAY_PRIVATE_KEY || ''
    const signString = privateKey + data + privateKey
    const signature = crypto.createHash('sha1').update(signString).digest('base64')
    return { data, signature }
  }

  /**
   * Helper to create webhook request with form data
   */
  function createWebhookRequest(data: string, signature: string, ip = '127.0.0.1') {
    const formData = new FormData()
    formData.append('data', data)
    formData.append('signature', signature)

    const request = new Request('http://localhost:3000/api/webhooks/liqpay', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
      },
      body: formData,
    })

    return request
  }

  describe('Security Layer 1: IP Validation', () => {
    it('should accept webhook when IP validation is disabled', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_123',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      // Mock webhook uniqueness check
      isWebhookUnique.mockResolvedValue(true)

      // Mock database update
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature, '1.2.3.4')
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.status).toBe('ok')
    })

    it('should reject webhook from unauthorized IP when validation enabled', async () => {
      process.env.DISABLE_WEBHOOK_IP_VALIDATION = 'false'

      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_123',
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      const request = createWebhookRequest(data, signature, '192.168.1.1')
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Unauthorized IP')
    })

    it('should accept webhook from whitelisted IP', async () => {
      process.env.DISABLE_WEBHOOK_IP_VALIDATION = 'false'

      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_123',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      // Use an IP from the LiqPay whitelist
      const request = createWebhookRequest(data, signature, '99.83.131.17')
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Security Layer 2: Signature Verification', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_123',
      }

      const data = Buffer.from(JSON.stringify(payload)).toString('base64')
      const invalidSignature = 'invalid_signature'

      const request = createWebhookRequest(data, invalidSignature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid signature')
    })

    it('should reject webhook with missing data', async () => {
      const formData = new FormData()
      formData.append('signature', 'some_signature')

      const request = new Request('http://localhost:3000/api/webhooks/liqpay', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing data or signature')
    })

    it('should reject webhook with missing signature', async () => {
      const payload = { order_id: 'test-123' }
      const data = Buffer.from(JSON.stringify(payload)).toString('base64')

      const formData = new FormData()
      formData.append('data', data)

      const request = new Request('http://localhost:3000/api/webhooks/liqpay', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing data or signature')
    })

    it('should reject tampered webhook data', async () => {
      const originalPayload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_123',
      }

      const { signature } = createLiqPayWebhookData(originalPayload)

      // Tamper with payload
      const tamperedPayload = {
        order_id: 'test-order-456', // Changed order ID
        status: 'success',
        transaction_id: 'txn_123',
      }
      const tamperedData = Buffer.from(JSON.stringify(tamperedPayload)).toString(
        'base64'
      )

      const request = createWebhookRequest(tamperedData, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid signature')
    })
  })

  describe('Security Layer 3: Replay Attack Prevention', () => {
    it('should reject duplicate webhook', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_duplicate',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      // First webhook is unique
      isWebhookUnique.mockResolvedValue(false)

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(409)
      expect(result.error).toContain('Duplicate webhook')
    })

    it('should accept webhook with unique transaction ID', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_unique',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle webhook without transaction_id using payment_id', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        payment_id: 'pay_123',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      const uniqueCheck = jest
        .spyOn(webhookSecurity, 'isWebhookUnique')
        .mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      await POST(request)

      expect(uniqueCheck).toHaveBeenCalledWith(
        'liqpay_pay_123',
        'liqpay',
        expect.any(Number),
        expect.any(Object)
      )
    })
  })

  describe('Security Layer 4: Timestamp Validation', () => {
    it('should reject webhook with old timestamp', async () => {
      // Create timestamp from 11 minutes ago (older than 10-minute tolerance)
      const oldDate = new Date(Date.now() - 11 * 60 * 1000).toISOString()

      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_old',
        create_date: oldDate,
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('timestamp too old')
    })

    it('should accept webhook with recent timestamp', async () => {
      // Create timestamp from 1 minute ago
      const recentDate = new Date(Date.now() - 60 * 1000).toISOString()

      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_recent',
        create_date: recentDate,
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept webhook without timestamp', async () => {
      const payload = {
        order_id: 'test-order-123',
        status: 'success',
        transaction_id: 'txn_no_timestamp',
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Payment Status Handling', () => {
    beforeEach(() => {
      isWebhookUnique.mockResolvedValue(true)
    })

    it('should handle successful payment', async () => {
      const payload = {
        order_id: 'order-success',
        status: 'success',
        transaction_id: 'txn_success',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      // Mock database queries
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE orders
        .mockResolvedValueOnce({
          // SELECT order with items for email
          rows: [
            {
              id: 'order-success',
              order_number: '#1234567890',
              user_email: 'test@example.com',
              user_name: 'John',
              user_surname: 'Doe',
              items: [
                {
                  product_name: 'Test Product',
                  quantity: 1,
                  unit_price: 1000,
                },
              ],
            },
          ],
        })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.status).toBe('ok')

      // Verify database was updated
      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'paid'/),
        ])
      )

      // Verify email was sent
      expect(sendOrderConfirmationEmail).toHaveBeenCalled()
    })

    it('should handle failed payment', async () => {
      const payload = {
        order_id: 'order-failed',
        status: 'failure',
        transaction_id: 'txn_failed',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify payment_status set to 'failed'
      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'failed'/),
        ])
      )

      // Email should NOT be sent for failed payment
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled()
    })

    it('should handle refunded payment', async () => {
      const payload = {
        order_id: 'order-refunded',
        status: 'reversed',
        transaction_id: 'txn_refunded',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify payment_status set to 'refunded'
      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'refunded'/),
        ])
      )
    })

    it('should handle pending payment', async () => {
      const payload = {
        order_id: 'order-pending',
        status: 'processing',
        transaction_id: 'txn_pending',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify payment_status set to 'pending'
      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/UPDATE orders/),
          expect.stringMatching(/payment_status = 'pending'/),
        ])
      )
    })

    it('should handle sandbox status as successful', async () => {
      const payload = {
        order_id: 'order-sandbox',
        status: 'sandbox',
        transaction_id: 'txn_sandbox',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'order-sandbox',
              order_number: '#1234567890',
              user_email: 'test@example.com',
              user_name: 'John',
              user_surname: 'Doe',
              items: [],
            },
          ],
        })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Sandbox should be treated as paid
      expect(sql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/payment_status = 'paid'/)])
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      isWebhookUnique.mockResolvedValue(true)
    })

    it('should return error when order_id is missing', async () => {
      const payload = {
        status: 'success',
        transaction_id: 'txn_no_order',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing order_id')
    })

    it('should handle database errors gracefully', async () => {
      const payload = {
        order_id: 'order-db-error',
        status: 'success',
        transaction_id: 'txn_db_error',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      sql.mockRejectedValue(new Error('Database connection failed'))

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Webhook handler failed')
      expect(result.details).toContain('Database connection failed')
    })

    it('should continue even if email sending fails', async () => {
      const payload = {
        order_id: 'order-email-error',
        status: 'success',
        transaction_id: 'txn_email_error',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

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

      sendOrderConfirmationEmail.mockRejectedValue(new Error('Email service down'))

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      // Should still return 200 even if email fails
      expect(response.status).toBe(200)
    })

    it('should handle malformed JSON in callback data', async () => {
      const invalidData = Buffer.from('not valid json').toString('base64')
      const privateKey = process.env.LIQPAY_PRIVATE_KEY || ''
      const signString = privateKey + invalidData + privateKey
      const signature = crypto.createHash('sha1').update(signString).digest('base64')

      const request = createWebhookRequest(invalidData, signature)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Webhook handler failed')
    })
  })

  describe('Response Headers', () => {
    it('should include security headers in all responses', async () => {
      const payload = {
        order_id: 'test-order',
        status: 'success',
        transaction_id: 'txn_headers',
        create_date: new Date().toISOString(),
      }

      const { data, signature } = createLiqPayWebhookData(payload)

      isWebhookUnique.mockResolvedValue(true)
      sql.mockResolvedValue({ rows: [], rowCount: 1 })

      const request = createWebhookRequest(data, signature)
      const response = await POST(request)

      expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
      expect(response.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate'
      )
    })
  })
})
