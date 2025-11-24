/**
 * Validation Schema Tests
 * Tests input sanitization, XSS prevention, and validation rules
 */

import {
  cartItemSchema,
  createOrderSchema,
  updateCartQuantitySchema,
  testEmailSchema,
  productIdSchema,
  orderIdSchema,
  paginationSchema,
  validateInput,
  safeValidateInput,
} from '@/app/lib/validation-schemas'
import { ZodError } from 'zod'

describe('Validation Schemas', () => {
  describe('XSS Prevention and Sanitization', () => {
    it('should remove HTML tags from string inputs', () => {
      const maliciousInput = {
        user_name: '<script>alert("xss")</script>John',
        user_surname: '<img src=x onerror=alert(1)>Doe',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      const result = createOrderSchema.parse(maliciousInput)

      expect(result.user_name).toBe('John')
      expect(result.user_surname).toBe('Doe')
      expect(result.user_name).not.toContain('<script>')
      expect(result.user_surname).not.toContain('<img')
    })

    it('should remove angle brackets from strings', () => {
      const input = {
        user_name: 'John<test>',
        user_surname: 'Doe>test<',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      const result = createOrderSchema.parse(input)

      expect(result.user_name).toBe('Johntest')
      expect(result.user_surname).toBe('Doetest')
      expect(result.user_name).not.toContain('<')
      expect(result.user_name).not.toContain('>')
    })

    it('should handle multiple XSS attempts', () => {
      const maliciousInput = {
        user_name: '<script>alert(1)</script><img src=x onerror=alert(2)>Test',
        user_surname: 'User',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'pickup',
        payment_method: 'liqpay',
        customer_notes: '<iframe src="evil.com"></iframe>Please deliver',
      }

      const result = createOrderSchema.parse(maliciousInput)

      expect(result.user_name).toBe('Test')
      expect(result.customer_notes).toBe('Please deliver')
      expect(result.customer_notes).not.toContain('<iframe')
    })

    it('should trim whitespace from strings', () => {
      const input = {
        user_name: '  John  ',
        user_surname: '  Doe  ',
        user_phone: '+380501234567',
        user_email: '  test@example.com  ',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      const result = createOrderSchema.parse(input)

      expect(result.user_name).toBe('John')
      expect(result.user_surname).toBe('Doe')
      expect(result.user_email).toBe('test@example.com')
    })

    it('should handle Cyrillic characters correctly', () => {
      const input = {
        user_name: 'Іван',
        user_surname: 'Петренко',
        user_phone: '+380501234567',
        user_email: 'ivan@example.com',
        delivery_method: 'nova_poshta',
        delivery_city: 'Київ',
        delivery_street: 'вул. Хрещатик',
        payment_method: 'liqpay',
      }

      const result = createOrderSchema.parse(input)

      expect(result.user_name).toBe('Іван')
      expect(result.user_surname).toBe('Петренко')
      expect(result.delivery_city).toBe('Київ')
      expect(result.delivery_street).toBe('вул. Хрещатик')
    })

    it('should handle special characters and emojis', () => {
      const input = {
        user_name: 'John & Jane',
        user_surname: "O'Connor",
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
        customer_notes: 'Please deliver carefully 🎉 Thank you!',
      }

      const result = createOrderSchema.parse(input)

      expect(result.user_name).toBe('John & Jane')
      expect(result.user_surname).toBe("O'Connor")
      expect(result.customer_notes).toContain('🎉')
    })
  })

  describe('Cart Item Schema', () => {
    it('should validate valid cart item', () => {
      const validItem = {
        productId: 123,
        quantity: 2,
        color: 'black',
      }

      const result = cartItemSchema.parse(validItem)

      expect(result.productId).toBe(123)
      expect(result.quantity).toBe(2)
      expect(result.color).toBe('black')
    })

    it('should accept product ID as string and convert to number', () => {
      const item = {
        productId: '456',
        quantity: 1,
      }

      const result = cartItemSchema.parse(item)

      expect(result.productId).toBe(456)
      expect(typeof result.productId).toBe('number')
    })

    it('should reject invalid product ID', () => {
      const invalidItems = [
        { productId: -1, quantity: 1 },
        { productId: 0, quantity: 1 },
        { productId: 'abc', quantity: 1 },
      ]

      invalidItems.forEach((item) => {
        expect(() => cartItemSchema.parse(item)).toThrow()
      })
    })

    it('should enforce quantity limits', () => {
      expect(() =>
        cartItemSchema.parse({ productId: 1, quantity: 0 })
      ).toThrow('Quantity must be at least 1')

      expect(() =>
        cartItemSchema.parse({ productId: 1, quantity: 101 })
      ).toThrow('Quantity cannot exceed 100')

      expect(() =>
        cartItemSchema.parse({ productId: 1, quantity: -5 })
      ).toThrow()
    })

    it('should accept optional color with default empty string', () => {
      const item = {
        productId: 1,
        quantity: 1,
      }

      const result = cartItemSchema.parse(item)

      expect(result.color).toBe('')
    })

    it('should sanitize color input', () => {
      const item = {
        productId: 1,
        quantity: 1,
        color: '<script>alert("xss")</script>red',
      }

      const result = cartItemSchema.parse(item)

      expect(result.color).toBe('red')
      expect(result.color).not.toContain('<script>')
    })
  })

  describe('Order Creation Schema', () => {
    const validOrderData = {
      user_name: 'John',
      user_surname: 'Doe',
      user_phone: '+380501234567',
      user_email: 'john@example.com',
      delivery_method: 'nova_poshta',
      payment_method: 'liqpay',
    }

    it('should validate complete order data', () => {
      const completeOrder = {
        ...validOrderData,
        delivery_address: 'Street 1, Apt 5',
        delivery_city: 'Kyiv',
        delivery_street: 'Khreshchatyk',
        delivery_building: '10',
        delivery_apartment: '5',
        delivery_postal_code: '01001',
        discount_percent: 10,
        delivery_cost: 50,
        prepayment_amount: 500,
        customer_notes: 'Please call before delivery',
      }

      const result = createOrderSchema.parse(completeOrder)

      expect(result).toMatchObject(completeOrder)
    })

    it('should require mandatory fields', () => {
      const requiredFields = [
        'user_name',
        'user_surname',
        'user_phone',
        'user_email',
        'delivery_method',
        'payment_method',
      ]

      requiredFields.forEach((field) => {
        const invalidData = { ...validOrderData }
        delete (invalidData as any)[field]

        expect(() => createOrderSchema.parse(invalidData)).toThrow()
      })
    })

    it('should validate phone number format', () => {
      const validPhones = ['+380501234567', '380501234567']

      validPhones.forEach((phone) => {
        const data = { ...validOrderData, user_phone: phone }
        const result = createOrderSchema.parse(data)
        expect(result.user_phone).toBe('+380501234567')
      })

      const invalidPhones = ['123456', '+1234567890', '0501234567', 'not-a-phone']

      invalidPhones.forEach((phone) => {
        const data = { ...validOrderData, user_phone: phone }
        expect(() => createOrderSchema.parse(data)).toThrow()
      })
    })

    it('should validate and normalize email', () => {
      const data = {
        ...validOrderData,
        user_email: '  TEST@EXAMPLE.COM  ',
      }

      const result = createOrderSchema.parse(data)

      expect(result.user_email).toBe('test@example.com')
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = ['not-an-email', '@example.com', 'test@', 'test']

      invalidEmails.forEach((email) => {
        const data = { ...validOrderData, user_email: email }
        expect(() => createOrderSchema.parse(data)).toThrow('Invalid email')
      })
    })

    it('should validate delivery method enum', () => {
      const validMethods = ['nova_poshta', 'store_delivery', 'pickup']

      validMethods.forEach((method) => {
        const data = { ...validOrderData, delivery_method: method }
        expect(() => createOrderSchema.parse(data)).not.toThrow()
      })

      const invalidMethods = ['courier', 'ups', 'fedex', '']

      invalidMethods.forEach((method) => {
        const data = { ...validOrderData, delivery_method: method }
        expect(() => createOrderSchema.parse(data)).toThrow('Invalid delivery method')
      })
    })

    it('should validate payment method enum', () => {
      const validMethods = ['liqpay', 'monobank', 'cash_on_delivery']

      validMethods.forEach((method) => {
        const data = { ...validOrderData, payment_method: method }
        expect(() => createOrderSchema.parse(data)).not.toThrow()
      })

      const invalidMethods = ['paypal', 'stripe', 'bitcoin']

      invalidMethods.forEach((method) => {
        const data = { ...validOrderData, payment_method: method }
        expect(() => createOrderSchema.parse(data)).toThrow('Invalid payment method')
      })
    })

    it('should enforce string length limits', () => {
      const data = {
        ...validOrderData,
        user_name: 'A'.repeat(101),
      }

      expect(() => createOrderSchema.parse(data)).toThrow('Name too long')
    })

    it('should enforce numeric constraints', () => {
      expect(() =>
        createOrderSchema.parse({
          ...validOrderData,
          discount_percent: 150,
        })
      ).toThrow('Discount cannot exceed 100%')

      expect(() =>
        createOrderSchema.parse({
          ...validOrderData,
          discount_percent: -10,
        })
      ).toThrow()

      expect(() =>
        createOrderSchema.parse({
          ...validOrderData,
          delivery_cost: 20000,
        })
      ).toThrow('Delivery cost too high')
    })

    it('should apply default values', () => {
      const result = createOrderSchema.parse(validOrderData)

      expect(result.discount_percent).toBe(0)
      expect(result.delivery_cost).toBe(0)
      expect(result.prepayment_amount).toBe(0)
    })

    it('should validate customer notes length', () => {
      const data = {
        ...validOrderData,
        customer_notes: 'A'.repeat(1001),
      }

      expect(() => createOrderSchema.parse(data)).toThrow('Notes too long')
    })
  })

  describe('Update Cart Quantity Schema', () => {
    it('should validate quantity update', () => {
      expect(updateCartQuantitySchema.parse({ quantity: 5 })).toEqual({
        quantity: 5,
      })
    })

    it('should allow zero quantity (for deletion)', () => {
      expect(updateCartQuantitySchema.parse({ quantity: 0 })).toEqual({
        quantity: 0,
      })
    })

    it('should enforce maximum quantity', () => {
      expect(() =>
        updateCartQuantitySchema.parse({ quantity: 101 })
      ).toThrow('Quantity cannot exceed 100')
    })

    it('should reject negative quantities', () => {
      expect(() =>
        updateCartQuantitySchema.parse({ quantity: -1 })
      ).toThrow('Quantity cannot be negative')
    })

    it('should reject non-integer quantities', () => {
      expect(() => updateCartQuantitySchema.parse({ quantity: 1.5 })).toThrow()
    })
  })

  describe('Email Schema', () => {
    it('should validate email for test endpoint', () => {
      const result = testEmailSchema.parse({ test_email: 'test@example.com' })

      expect(result.test_email).toBe('test@example.com')
    })

    it('should reject invalid emails', () => {
      expect(() => testEmailSchema.parse({ test_email: 'invalid' })).toThrow()
    })
  })

  describe('ID Validation Schemas', () => {
    it('should validate product ID', () => {
      const result = productIdSchema.parse({ productId: 123 })

      expect(result.productId).toBe(123)
    })

    it('should reject invalid product IDs', () => {
      expect(() => productIdSchema.parse({ productId: -1 })).toThrow()
      expect(() => productIdSchema.parse({ productId: 0 })).toThrow()
    })

    it('should validate UUID order ID', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const result = orderIdSchema.parse({ orderId: validUUID })

      expect(result.orderId).toBe(validUUID)
    })

    it('should reject invalid UUIDs', () => {
      expect(() => orderIdSchema.parse({ orderId: 'not-a-uuid' })).toThrow()
      expect(() => orderIdSchema.parse({ orderId: '123' })).toThrow()
    })
  })

  describe('Pagination Schema', () => {
    it('should validate pagination parameters', () => {
      const result = paginationSchema.parse({ page: 2, limit: 50 })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(50)
    })

    it('should apply default values', () => {
      const result = paginationSchema.parse({})

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should enforce minimum page number', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow(
        'Page must be at least 1'
      )
    })

    it('should enforce limit constraints', () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow()
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow(
        'Limit cannot exceed 100'
      )
    })
  })

  describe('Validation Helper Functions', () => {
    it('should validate input using validateInput', () => {
      const data = { productId: 123 }
      const result = validateInput(productIdSchema, data)

      expect(result.productId).toBe(123)
    })

    it('should throw error for invalid input', () => {
      const data = { productId: -1 }

      expect(() => validateInput(productIdSchema, data)).toThrow(ZodError)
    })

    it('should safely validate with safeValidateInput - success case', () => {
      const data = { productId: 123 }
      const result = safeValidateInput(productIdSchema, data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.productId).toBe(123)
      }
    })

    it('should safely validate with safeValidateInput - failure case', () => {
      const data = { productId: -1 }
      const result = safeValidateInput(productIdSchema, data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError)
      }
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle SQL injection attempts in strings', () => {
      const sqlInjection = {
        user_name: "'; DROP TABLE orders; --",
        user_surname: "1' OR '1'='1",
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      const result = createOrderSchema.parse(sqlInjection)

      // SQL injection should be sanitized (XSS chars removed but SQL chars remain)
      // Note: The real SQL injection protection comes from parameterized queries
      expect(result.user_name).toBe("'; DROP TABLE orders; --")
      expect(result.user_surname).toBe("1' OR '1'='1")
    })

    it('should handle null byte injection', () => {
      const input = {
        user_name: 'John\x00Admin',
        user_surname: 'Doe',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      // Schema should handle or reject null bytes
      const result = createOrderSchema.parse(input)

      expect(result.user_name).toBeTruthy()
    })

    it('should handle very long strings gracefully', () => {
      const input = {
        user_name: 'A'.repeat(200),
        user_surname: 'Doe',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      expect(() => createOrderSchema.parse(input)).toThrow('Name too long')
    })

    it('should handle empty strings appropriately', () => {
      const input = {
        user_name: '',
        user_surname: 'Doe',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      expect(() => createOrderSchema.parse(input)).toThrow('Name is required')
    })

    it('should handle whitespace-only strings', () => {
      const input = {
        user_name: '   ',
        user_surname: 'Doe',
        user_phone: '+380501234567',
        user_email: 'test@example.com',
        delivery_method: 'nova_poshta',
        payment_method: 'liqpay',
      }

      // After trimming, should be empty and fail validation
      expect(() => createOrderSchema.parse(input)).toThrow()
    })
  })
})
