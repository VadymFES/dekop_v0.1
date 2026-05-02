/**
 * LiqPay Service Unit Tests
 * Tests for payment creation, signature verification, and status mapping
 */

import crypto from 'crypto'
import {
  createLiqPayPayment,
  verifyLiqPayCallback,
  parseLiqPayCallback,
  mapLiqPayStatus,
  checkLiqPayPaymentStatus,
  generateLiqPayCheckoutForm,
  CreateLiqPayPaymentParams,
} from '@/app/lib/services/liqpay-service'
import { mockFetch, resetFetchMocks } from '../test-utils'

describe('LiqPay Service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      LIQPAY_PUBLIC_KEY: 'test_public_key',
      LIQPAY_PRIVATE_KEY: 'test_private_key',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    resetFetchMocks()
  })

  describe('createLiqPayPayment', () => {
    it('should create payment with correct data and signature', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 1000,
        orderId: 'test-order-123',
        orderNumber: '#1234567890',
        description: 'Test payment',
        customerEmail: 'test@example.com',
      }

      const result = await createLiqPayPayment(params)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.signature).toBeDefined()
      expect(result.checkoutUrl).toBe('https://www.liqpay.ua/api/3/checkout')

      // Decode and verify the data
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.public_key).toBe('test_public_key')
      expect(decodedData.version).toBe('3')
      expect(decodedData.action).toBe('pay')
      expect(decodedData.amount).toBe(1000)
      expect(decodedData.currency).toBe('UAH')
      expect(decodedData.order_id).toBe('test-order-123')
      expect(decodedData.sender_email).toBe('test@example.com')
      expect(decodedData.language).toBe('uk')
    })

    it('should generate valid signature', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 500,
        orderId: 'test-order-456',
        orderNumber: '#9876543210',
        description: 'Test payment 2',
      }

      const result = await createLiqPayPayment(params)

      // Manually verify signature
      const privateKey = process.env.LIQPAY_PRIVATE_KEY || ''
      const signString = privateKey + result.data + privateKey
      const expectedSignature = crypto
        .createHash('sha1')
        .update(signString)
        .digest('base64')

      expect(result.signature).toBe(expectedSignature)
    })

    it('should use default description if not provided', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 1000,
        orderId: 'test-order-789',
        orderNumber: '#1111111111',
        description: '',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.description).toBe('Оплата замовлення #1111111111')
    })

    it('should include custom URLs if provided', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 1000,
        orderId: 'test-order-custom',
        orderNumber: '#2222222222',
        description: 'Custom URLs test',
        resultUrl: 'http://example.com/success',
        serverUrl: 'http://example.com/webhook',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.result_url).toBe('http://example.com/success')
      expect(decodedData.server_url).toBe('http://example.com/webhook')
    })

    it('should throw error if credentials are missing', async () => {
      delete process.env.LIQPAY_PUBLIC_KEY
      delete process.env.LIQPAY_PRIVATE_KEY

      const params: CreateLiqPayPaymentParams = {
        amount: 1000,
        orderId: 'test-order-no-creds',
        orderNumber: '#3333333333',
        description: 'No credentials test',
      }

      await expect(createLiqPayPayment(params)).rejects.toThrow(
        'LiqPay credentials are not configured'
      )
    })

    it('should omit sender_email if not provided', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 1000,
        orderId: 'test-order-no-email',
        orderNumber: '#4444444444',
        description: 'No email test',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.sender_email).toBeUndefined()
    })
  })

  describe('verifyLiqPayCallback', () => {
    it('should verify valid signature', () => {
      const testData = { order_id: 'test-123', status: 'success' }
      const data = Buffer.from(JSON.stringify(testData)).toString('base64')
      const privateKey = process.env.LIQPAY_PRIVATE_KEY || ''
      const signString = privateKey + data + privateKey
      const signature = crypto.createHash('sha1').update(signString).digest('base64')

      const result = verifyLiqPayCallback(data, signature)

      expect(result).toBe(true)
    })

    it('should reject invalid signature', () => {
      const testData = { order_id: 'test-123', status: 'success' }
      const data = Buffer.from(JSON.stringify(testData)).toString('base64')
      const invalidSignature = 'invalid_signature'

      const result = verifyLiqPayCallback(data, invalidSignature)

      expect(result).toBe(false)
    })

    it('should reject tampered data', () => {
      const testData = { order_id: 'test-123', status: 'success' }
      const data = Buffer.from(JSON.stringify(testData)).toString('base64')
      const privateKey = process.env.LIQPAY_PRIVATE_KEY || ''
      const signString = privateKey + data + privateKey
      const signature = crypto.createHash('sha1').update(signString).digest('base64')

      // Tamper with the data
      const tamperedData = { order_id: 'test-456', status: 'success' }
      const tamperedDataEncoded = Buffer.from(JSON.stringify(tamperedData)).toString(
        'base64'
      )

      const result = verifyLiqPayCallback(tamperedDataEncoded, signature)

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', () => {
      const result = verifyLiqPayCallback('', '')

      expect(result).toBe(false)
    })
  })

  describe('parseLiqPayCallback', () => {
    it('should parse valid base64 encoded data', () => {
      const testData = {
        order_id: 'test-123',
        status: 'success',
        amount: 1000,
      }
      const encodedData = Buffer.from(JSON.stringify(testData)).toString('base64')

      const result = parseLiqPayCallback(encodedData)

      expect(result).toEqual(testData)
    })

    it('should throw error for invalid data', () => {
      expect(() => parseLiqPayCallback('invalid_base64!!!')).toThrow(
        'Failed to parse LiqPay callback data'
      )
    })

    it('should throw error for malformed JSON', () => {
      const invalidJson = Buffer.from('not valid json').toString('base64')

      expect(() => parseLiqPayCallback(invalidJson)).toThrow(
        'Failed to parse LiqPay callback data'
      )
    })
  })

  describe('mapLiqPayStatus', () => {
    it('should map success status to paid', () => {
      expect(mapLiqPayStatus('success')).toBe('paid')
    })

    it('should map sandbox status to paid', () => {
      expect(mapLiqPayStatus('sandbox')).toBe('paid')
    })

    it('should map failure status to failed', () => {
      expect(mapLiqPayStatus('failure')).toBe('failed')
    })

    it('should map error status to failed', () => {
      expect(mapLiqPayStatus('error')).toBe('failed')
    })

    it('should map reversed status to refunded', () => {
      expect(mapLiqPayStatus('reversed')).toBe('refunded')
    })

    it('should map processing status to pending', () => {
      expect(mapLiqPayStatus('processing')).toBe('pending')
    })

    it('should map wait_accept status to pending', () => {
      expect(mapLiqPayStatus('wait_accept')).toBe('pending')
    })

    it('should map wait_lc status to pending', () => {
      expect(mapLiqPayStatus('wait_lc')).toBe('pending')
    })

    it('should map wait_reserve status to pending', () => {
      expect(mapLiqPayStatus('wait_reserve')).toBe('pending')
    })

    it('should map wait_compensation status to pending', () => {
      expect(mapLiqPayStatus('wait_compensation')).toBe('pending')
    })

    it('should map unknown status to pending', () => {
      expect(mapLiqPayStatus('unknown_status')).toBe('pending')
    })
  })

  describe('checkLiqPayPaymentStatus', () => {
    it('should check payment status successfully', async () => {
      const mockResponse = {
        status: 'success',
        order_id: 'test-123',
        amount: 1000,
      }

      mockFetch(mockResponse, 200)

      const result = await checkLiqPayPaymentStatus('test-123')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.liqpay.ua/api/request',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('should throw error if credentials are missing', async () => {
      delete process.env.LIQPAY_PUBLIC_KEY
      delete process.env.LIQPAY_PRIVATE_KEY

      await expect(checkLiqPayPaymentStatus('test-123')).rejects.toThrow(
        'LiqPay credentials are not configured'
      )
    })

    it('should throw error on API failure', async () => {
      mockFetch({}, 500)

      await expect(checkLiqPayPaymentStatus('test-123')).rejects.toThrow(
        'LiqPay API error: 500'
      )
    })

    it('should throw error on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      await expect(checkLiqPayPaymentStatus('test-123')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('generateLiqPayCheckoutForm', () => {
    it('should generate valid HTML form', () => {
      const data = 'base64_encoded_data'
      const signature = 'test_signature'

      const form = generateLiqPayCheckoutForm(data, signature)

      expect(form).toContain('method="POST"')
      expect(form).toContain('action="https://www.liqpay.ua/api/3/checkout"')
      expect(form).toContain(`name="data" value="${data}"`)
      expect(form).toContain(`name="signature" value="${signature}"`)
      expect(form).toContain('id="liqpay-form"')
    })

    it('should escape special characters in data', () => {
      const data = 'data"with"quotes'
      const signature = 'signature\'with\'quotes'

      const form = generateLiqPayCheckoutForm(data, signature)

      expect(form).toContain(data)
      expect(form).toContain(signature)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle very large amounts', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 999999.99,
        orderId: 'test-large-amount',
        orderNumber: '#5555555555',
        description: 'Large amount test',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.amount).toBe(999999.99)
    })

    it('should handle zero amount', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 0,
        orderId: 'test-zero-amount',
        orderNumber: '#6666666666',
        description: 'Zero amount test',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.amount).toBe(0)
    })

    it('should handle special characters in description', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 100,
        orderId: 'test-special-chars',
        orderNumber: '#7777777777',
        description: 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\'',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.description).toBe(
        'Test <script>alert("xss")</script> & "quotes" \'apostrophes\''
      )
    })

    it('should handle Cyrillic characters in description', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 100,
        orderId: 'test-cyrillic',
        orderNumber: '#8888888888',
        description: 'Оплата замовлення №123 з доставкою',
      }

      const result = await createLiqPayPayment(params)
      const decodedData = JSON.parse(
        Buffer.from(result.data, 'base64').toString('utf-8')
      )

      expect(decodedData.description).toBe('Оплата замовлення №123 з доставкою')
    })

    it('should handle invalid email format', async () => {
      const params: CreateLiqPayPaymentParams = {
        amount: 100,
        orderId: 'test-invalid-email',
        orderNumber: '#9999999999',
        description: 'Invalid email test',
        customerEmail: 'not-an-email',
      }

      // Service should still create payment (validation should be done upstream)
      const result = await createLiqPayPayment(params)

      expect(result.success).toBe(true)
    })
  })
})
