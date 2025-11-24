/**
 * Monobank Service Unit Tests
 * Tests for invoice creation, signature verification, and status mapping
 */

import crypto from 'crypto'
import {
  createMonobankInvoice,
  getMonobankInvoiceStatus,
  cancelMonobankInvoice,
  verifyMonobankWebhook,
  mapMonobankStatus,
  CreateMonobankInvoiceParams,
} from '@/app/lib/services/monobank-service'
import { mockFetch, resetFetchMocks, createTestKeyPair } from '../test-utils'

describe('Monobank Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      MONOBANK_TOKEN: 'test_monobank_token',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    resetFetchMocks()
  })

  describe('createMonobankInvoice', () => {
    it('should create invoice with correct data', async () => {
      const mockResponse = {
        invoiceId: 'test-invoice-123',
        pageUrl: 'https://pay.monobank.ua/test-invoice-123',
      }

      mockFetch(mockResponse, 200)

      const params: CreateMonobankInvoiceParams = {
        amount: 1000,
        orderId: 'test-order-123',
        orderNumber: '#1234567890',
        customerEmail: 'test@example.com',
        redirectUrl: 'http://localhost:3000/success',
        webhookUrl: 'http://localhost:3000/webhook',
      }

      const result = await createMonobankInvoice(params)

      expect(result.invoiceId).toBe('test-invoice-123')
      expect(result.pageUrl).toBe('https://pay.monobank.ua/test-invoice-123')

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monobank.ua/api/merchant/invoice/create',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Token': 'test_monobank_token',
          },
        })
      )

      // Verify request body
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.amount).toBe(100000) // 1000 UAH = 100000 kopiykas
      expect(requestBody.ccy).toBe(980) // UAH currency code
      expect(requestBody.merchantPaymInfo.reference).toBe('test-order-123')
      expect(requestBody.merchantPaymInfo.destination).toContain('#1234567890')
      expect(requestBody.merchantPaymInfo.customerEmails).toEqual(['test@example.com'])
      expect(requestBody.redirectUrl).toBe('http://localhost:3000/success')
      expect(requestBody.webHookUrl).toBe('http://localhost:3000/webhook')
      expect(requestBody.validity).toBe(3600)
    })

    it('should convert amount to kopiykas correctly', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 1234.56,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.amount).toBe(123456) // 1234.56 UAH = 123456 kopiykas
    })

    it('should round kopiykas to nearest integer', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 1234.567, // Should round to 123457 kopiykas
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.amount).toBe(123457)
    })

    it('should include cancel URL when provided', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com/success',
        cancelUrl: 'http://test.com/cancel',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.cancelUrl).toBe('http://test.com/cancel')
    })

    it('should omit customer email when not provided', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.merchantPaymInfo.customerEmails).toBeUndefined()
    })

    it('should throw error if token is missing', async () => {
      delete process.env.MONOBANK_TOKEN

      const params: CreateMonobankInvoiceParams = {
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      }

      await expect(createMonobankInvoice(params)).rejects.toThrow(
        'Monobank token is not configured'
      )
    })

    it('should throw error on API failure', async () => {
      mockFetch({ error: 'Invalid token' }, 401)

      const params: CreateMonobankInvoiceParams = {
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      }

      await expect(createMonobankInvoice(params)).rejects.toThrow(
        'Monobank API error: 401'
      )
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const params: CreateMonobankInvoiceParams = {
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      }

      await expect(createMonobankInvoice(params)).rejects.toThrow('Network error')
    })

    it('should handle Cyrillic characters in order number', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 1000,
        orderId: 'test',
        orderNumber: '#Замовлення-123',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.merchantPaymInfo.destination).toContain('Замовлення-123')
    })
  })

  describe('getMonobankInvoiceStatus', () => {
    it('should retrieve invoice status successfully', async () => {
      const mockResponse = {
        status: 'success',
        amount: 100000,
        ccy: 980,
        createdDate: '2024-01-01T12:00:00Z',
        modifiedDate: '2024-01-01T12:05:00Z',
        reference: 'test-order-123',
      }

      mockFetch(mockResponse, 200)

      const result = await getMonobankInvoiceStatus('test-invoice-123')

      expect(result.status).toBe('success')
      expect(result.amount).toBe(100000)
      expect(result.reference).toBe('test-order-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monobank.ua/api/merchant/invoice/status?invoiceId=test-invoice-123',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Token': 'test_monobank_token',
          },
        })
      )
    })

    it('should throw error if token is missing', async () => {
      delete process.env.MONOBANK_TOKEN

      await expect(getMonobankInvoiceStatus('test-invoice-123')).rejects.toThrow(
        'Monobank token is not configured'
      )
    })

    it('should throw error on API failure', async () => {
      mockFetch({ error: 'Invoice not found' }, 404)

      await expect(getMonobankInvoiceStatus('test-invoice-123')).rejects.toThrow(
        'Monobank API error: 404'
      )
    })
  })

  describe('cancelMonobankInvoice', () => {
    it('should cancel invoice successfully', async () => {
      const mockResponse = { status: 'cancelled' }

      mockFetch(mockResponse, 200)

      const result = await cancelMonobankInvoice('test-invoice-123')

      expect(result).toEqual(mockResponse)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monobank.ua/api/merchant/invoice/cancel',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Token': 'test_monobank_token',
          },
        })
      )

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.invoiceId).toBe('test-invoice-123')
    })

    it('should throw error if token is missing', async () => {
      delete process.env.MONOBANK_TOKEN

      await expect(cancelMonobankInvoice('test-invoice-123')).rejects.toThrow(
        'Monobank token is not configured'
      )
    })

    it('should throw error on API failure', async () => {
      mockFetch({ error: 'Cannot cancel' }, 400)

      await expect(cancelMonobankInvoice('test-invoice-123')).rejects.toThrow(
        'Monobank API error: 400'
      )
    })
  })

  describe('verifyMonobankWebhook', () => {
    it('should verify valid RSA signature', () => {
      // Generate test key pair
      const { publicKey, privateKey } = createTestKeyPair()

      const testBody = JSON.stringify({
        invoiceId: 'test-123',
        status: 'success',
      })

      // Sign the body
      const sign = crypto.createSign('SHA256')
      sign.update(testBody)
      sign.end()
      const signature = sign.sign(privateKey, 'base64')

      // Verify the signature
      const result = verifyMonobankWebhook(publicKey, signature, testBody)

      expect(result).toBe(true)
    })

    it('should reject invalid signature', () => {
      const { publicKey } = createTestKeyPair()

      const testBody = JSON.stringify({
        invoiceId: 'test-123',
        status: 'success',
      })

      const invalidSignature = 'invalid_signature'

      const result = verifyMonobankWebhook(publicKey, invalidSignature, testBody)

      expect(result).toBe(false)
    })

    it('should reject tampered data', () => {
      const { publicKey, privateKey } = createTestKeyPair()

      const originalBody = JSON.stringify({
        invoiceId: 'test-123',
        status: 'success',
      })

      // Sign original body
      const sign = crypto.createSign('SHA256')
      sign.update(originalBody)
      sign.end()
      const signature = sign.sign(privateKey, 'base64')

      // Tamper with body
      const tamperedBody = JSON.stringify({
        invoiceId: 'test-456',
        status: 'success',
      })

      // Verify with tampered body should fail
      const result = verifyMonobankWebhook(publicKey, signature, tamperedBody)

      expect(result).toBe(false)
    })

    it('should reject when public key is missing', () => {
      const result = verifyMonobankWebhook('', 'signature', 'body')

      expect(result).toBe(false)
    })

    it('should reject when signature is missing', () => {
      const { publicKey } = createTestKeyPair()

      const result = verifyMonobankWebhook(publicKey, '', 'body')

      expect(result).toBe(false)
    })

    it('should reject when body is missing', () => {
      const { publicKey } = createTestKeyPair()

      const result = verifyMonobankWebhook(publicKey, 'signature', '')

      expect(result).toBe(false)
    })

    it('should handle verification errors gracefully', () => {
      // Invalid public key format
      const invalidPublicKey = 'not-a-valid-public-key'

      const result = verifyMonobankWebhook(
        invalidPublicKey,
        'signature',
        'body'
      )

      expect(result).toBe(false)
    })

    it('should verify signature with special characters in body', () => {
      const { publicKey, privateKey } = createTestKeyPair()

      const testBody = JSON.stringify({
        invoiceId: 'test-123',
        description: 'Test <>&"\' special chars',
        unicode: 'Українська мова 🎉',
      })

      const sign = crypto.createSign('SHA256')
      sign.update(testBody)
      sign.end()
      const signature = sign.sign(privateKey, 'base64')

      const result = verifyMonobankWebhook(publicKey, signature, testBody)

      expect(result).toBe(true)
    })
  })

  describe('mapMonobankStatus', () => {
    it('should map success status to paid', () => {
      expect(mapMonobankStatus('success')).toBe('paid')
    })

    it('should map failure status to failed', () => {
      expect(mapMonobankStatus('failure')).toBe('failed')
    })

    it('should map expired status to failed', () => {
      expect(mapMonobankStatus('expired')).toBe('failed')
    })

    it('should map reversed status to refunded', () => {
      expect(mapMonobankStatus('reversed')).toBe('refunded')
    })

    it('should map created status to pending', () => {
      expect(mapMonobankStatus('created')).toBe('pending')
    })

    it('should map processing status to pending', () => {
      expect(mapMonobankStatus('processing')).toBe('pending')
    })

    it('should map hold status to pending', () => {
      expect(mapMonobankStatus('hold')).toBe('pending')
    })

    it('should map unknown status to pending', () => {
      expect(mapMonobankStatus('unknown_status')).toBe('pending')
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle very large amounts', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 999999.99,
        orderId: 'test-large',
        orderNumber: '#999',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.amount).toBe(99999999) // 999999.99 UAH
    })

    it('should handle zero amount', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      await createMonobankInvoice({
        amount: 0,
        orderId: 'test-zero',
        orderNumber: '#000',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.amount).toBe(0)
    })

    it('should handle decimal precision correctly', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      // Test various decimal amounts
      const testCases = [
        { amount: 10.01, expected: 1001 },
        { amount: 10.99, expected: 1099 },
        { amount: 10.005, expected: 1001 }, // Rounds to nearest
        { amount: 10.995, expected: 1100 }, // Rounds to nearest
      ]

      for (const testCase of testCases) {
        ;(global.fetch as jest.Mock).mockClear()
        mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

        await createMonobankInvoice({
          amount: testCase.amount,
          orderId: 'test',
          orderNumber: '#123',
          redirectUrl: 'http://test.com',
          webhookUrl: 'http://test.com/webhook',
        })

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)

        expect(requestBody.amount).toBe(testCase.expected)
      }
    })

    it('should handle multiple customer emails', async () => {
      mockFetch({ invoiceId: 'test', pageUrl: 'test' }, 200)

      // Test with single email (should be in array)
      await createMonobankInvoice({
        amount: 1000,
        orderId: 'test',
        orderNumber: '#123',
        customerEmail: 'test@example.com',
        redirectUrl: 'http://test.com',
        webhookUrl: 'http://test.com/webhook',
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(Array.isArray(requestBody.merchantPaymInfo.customerEmails)).toBe(true)
      expect(requestBody.merchantPaymInfo.customerEmails).toHaveLength(1)
    })
  })
})
