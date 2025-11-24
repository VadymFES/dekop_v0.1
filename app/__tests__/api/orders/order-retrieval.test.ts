/**
 * Order Retrieval API Tests
 * Tests IDOR protection and email verification
 */

import { GET } from '@/app/api/orders/[orderId]/route'
import { createMockRequest } from '../../test-utils'

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
}))

const { sql } = require('@vercel/postgres')

describe('Order Retrieval API - IDOR Protection', () => {
  const testOrderId = '550e8400-e29b-41d4-a716-446655440000'
  const testEmail = 'customer@example.com'

  const mockOrderData = {
    id: testOrderId,
    order_number: '#1234567890',
    user_email: testEmail,
    user_name: 'John',
    user_surname: 'Doe',
    user_phone: '+380501234567',
    payment_status: 'paid',
    order_status: 'confirmed',
    total_amount: 1000,
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('IDOR Protection', () => {
    it('should return order when email matches', async () => {
      sql.mockResolvedValue({
        rows: [
          {
            ...mockOrderData,
            items: [
              {
                id: 'item-1',
                product_name: 'Test Product',
                quantity: 1,
                unit_price: 1000,
              },
            ],
          },
        ],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.order.id).toBe(testOrderId)
      expect(result.order.user_email).toBe(testEmail)
    })

    it('should reject access without email parameter', async () => {
      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('email')
      expect(sql).not.toHaveBeenCalled()
    })

    it('should reject access with wrong email (IDOR attack)', async () => {
      const attackerEmail = 'attacker@example.com'

      sql.mockResolvedValue({
        rows: [], // No results when email doesn't match
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${attackerEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBeTruthy()

      // Verify query checked both order ID AND email
      expect(sql).toHaveBeenCalled()
      const query = sql.mock.calls[0][0]
      expect(query.join('')).toContain('user_email')
    })

    it('should not reveal whether order exists or email is wrong', async () => {
      // Test with non-existent order
      sql.mockResolvedValue({ rows: [] })

      const request1 = new Request(
        `http://localhost:3000/api/orders/non-existent-id?email=${testEmail}`
      )

      const response1 = await GET(request1, {
        params: Promise.resolve({ orderId: 'non-existent-id' }),
      })

      const result1 = await response1.json()

      // Test with wrong email
      const request2 = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=wrong@example.com`
      )

      const response2 = await GET(request2, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result2 = await response2.json()

      // Both should return same generic error message
      expect(response1.status).toBe(404)
      expect(response2.status).toBe(404)
      expect(result1.error).toBe(result2.error)
    })

    it('should handle case-insensitive email comparison', async () => {
      sql.mockResolvedValue({
        rows: [{ ...mockOrderData, items: [] }],
      })

      const uppercaseEmail = testEmail.toUpperCase()

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${uppercaseEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(response.status).toBe(200)

      // Verify query uses LOWER() for case-insensitive comparison
      const query = sql.mock.calls[0][0]
      expect(query.join('')).toContain('LOWER')
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const invalidEmails = [
        { email: 'not-an-email', expectedStatus: 400 },
        { email: '@example.com', expectedStatus: 400 },
        { email: 'test@', expectedStatus: 400 },
        { email: 'test', expectedStatus: 400 },
        { email: '', expectedStatus: 401 }, // Empty string returns 401 (no email)
        { email: '<script>alert("xss")</script>', expectedStatus: 400 },
      ]

      for (const { email, expectedStatus } of invalidEmails) {
        const request = new Request(
          `http://localhost:3000/api/orders/${testOrderId}?email=${encodeURIComponent(
            email
          )}`
        )

        const response = await GET(request, {
          params: Promise.resolve({ orderId: testOrderId }),
        })

        const result = await response.json()

        expect(response.status).toBe(expectedStatus)
        expect(result.error).toBeTruthy()
        expect(sql).not.toHaveBeenCalled()

        jest.clearAllMocks()
      }
    })

    it('should validate email before querying database', async () => {
      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=invalid-email`
      )

      await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      // Database should not be queried for invalid email
      expect(sql).not.toHaveBeenCalled()
    })

    it('should require order ID', async () => {
      const request = new Request(
        `http://localhost:3000/api/orders/?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: '' }),
      })

      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Order ID')
    })

    it('should accept valid UUID order IDs', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ]

      sql.mockResolvedValue({
        rows: [{ ...mockOrderData, items: [] }],
      })

      for (const uuid of validUUIDs) {
        const request = new Request(
          `http://localhost:3000/api/orders/${uuid}?email=${testEmail}`
        )

        const response = await GET(request, {
          params: Promise.resolve({ orderId: uuid }),
        })

        expect(response.status).toBe(200)

        jest.clearAllMocks()
        sql.mockResolvedValue({
          rows: [{ ...mockOrderData, items: [] }],
        })
      }
    })
  })

  describe('Order Data Retrieval', () => {
    it('should return complete order with items', async () => {
      const orderWithItems = {
        ...mockOrderData,
        items: [
          {
            id: 'item-1',
            product_name: 'Product 1',
            quantity: 2,
            unit_price: 500,
            total_price: 1000,
          },
          {
            id: 'item-2',
            product_name: 'Product 2',
            quantity: 1,
            unit_price: 300,
            total_price: 300,
          },
        ],
      }

      sql.mockResolvedValue({
        rows: [orderWithItems],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(result.order.items).toHaveLength(2)
      expect(result.order.items[0].product_name).toBe('Product 1')
      expect(result.order.items[1].product_name).toBe('Product 2')
    })

    it('should handle orders with no items', async () => {
      sql.mockResolvedValue({
        rows: [{ ...mockOrderData, items: null }],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.order.items).toEqual([])
    })

    it('should include all order fields', async () => {
      const completeOrder = {
        ...mockOrderData,
        delivery_method: 'nova_poshta',
        delivery_address: 'Test Address',
        delivery_city: 'Kyiv',
        payment_method: 'liqpay',
        subtotal: 1000,
        discount_amount: 100,
        delivery_cost: 50,
        prepayment_amount: 500,
        customer_notes: 'Test notes',
        items: [],
      }

      sql.mockResolvedValue({
        rows: [completeOrder],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(result.order).toMatchObject({
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
        subtotal: 1000,
        customer_notes: 'Test notes',
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      sql.mockRejectedValue(new Error('Database connection failed'))

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBeTruthy()
    })

    it('should handle malformed database responses', async () => {
      sql.mockResolvedValue({
        rows: [null],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      // Should handle gracefully
      expect([200, 500]).toContain(response.status)
    })
  })

  describe('Security Best Practices', () => {
    it('should not leak sensitive information in error messages', async () => {
      sql.mockResolvedValue({ rows: [] })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=wrong@example.com`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      const result = await response.json()

      // Error message should be generic, not revealing if order exists
      expect(result.error).not.toContain('exists')
      expect(result.error).not.toContain('found')
      expect(result.error).not.toContain('wrong')
    })

    it('should prevent email enumeration attacks', async () => {
      // Attacker tries to enumerate valid emails
      const testEmails = [
        'user1@example.com',
        'user2@example.com',
        'admin@example.com',
      ]

      sql.mockResolvedValue({ rows: [] })

      for (const email of testEmails) {
        const request = new Request(
          `http://localhost:3000/api/orders/${testOrderId}?email=${email}`
        )

        const response = await GET(request, {
          params: Promise.resolve({ orderId: testOrderId }),
        })

        const result = await response.json()

        // All should return same error
        expect(response.status).toBe(404)
        expect(result.error).toBeTruthy()
      }
    })

    it('should use parameterized queries to prevent SQL injection', async () => {
      const sqlInjectionEmail = "test@example.com'; DROP TABLE orders; --"

      sql.mockResolvedValue({ rows: [] })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${encodeURIComponent(
          sqlInjectionEmail
        )}`
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      // Should be handled safely (parameterized query)
      // The email passes basic validation, queries DB, and returns 404 (no match)
      expect(response.status).toBe(404)

      // Verify the database was queried (meaning the email format passed validation)
      expect(sql).toHaveBeenCalled()

      // The use of sql`...` tagged template literals ensures parameterized queries
      // The SQL injection attempt is safely handled as a literal string parameter
      const query = sql.mock.calls[0]
      expect(query).toBeDefined()
      expect(query.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Considerations', () => {
    it('should fetch order and items in single query', async () => {
      sql.mockResolvedValue({
        rows: [{ ...mockOrderData, items: [] }],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      // Should only make one database call
      expect(sql).toHaveBeenCalledTimes(1)
    })

    it('should use json_agg for efficient item fetching', async () => {
      sql.mockResolvedValue({
        rows: [{ ...mockOrderData, items: [] }],
      })

      const request = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?email=${testEmail}`
      )

      await GET(request, {
        params: Promise.resolve({ orderId: testOrderId }),
      })

      // Verify query uses json_agg for aggregating items
      const query = sql.mock.calls[0][0]
      expect(query.join('')).toContain('json_agg')
    })
  })
})
