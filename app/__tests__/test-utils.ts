/**
 * Test Utilities
 * Common helper functions and mocks for testing
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  cookies?: Record<string, string>
  ip?: string
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    cookies = {},
    ip = '127.0.0.1',
  } = options

  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    }),
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body)
  }

  const request = new NextRequest(url, requestInit)

  // Mock cookies
  if (Object.keys(cookies).length > 0) {
    const mockCookies = {
      get: jest.fn((name: string) => cookies[name] ? { value: cookies[name] } : undefined),
      getAll: jest.fn(() => Object.entries(cookies).map(([name, value]) => ({ name, value }))),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn((name: string) => name in cookies),
    }
    Object.defineProperty(request, 'cookies', {
      get: () => mockCookies,
    })
  }

  return request
}

/**
 * Mock database query results
 */
export const mockDbClient = {
  query: jest.fn(),
  sql: jest.fn(),
}

/**
 * Creates a mock database transaction
 */
export function createMockTransaction() {
  const queries: any[] = []

  const mockClient = {
    query: jest.fn((text: string, values?: any[]) => {
      queries.push({ text, values })
      return Promise.resolve({ rows: [], rowCount: 0 })
    }),
    sql: jest.fn(),
    release: jest.fn(),
  }

  return {
    client: mockClient,
    queries,
    mockResult: (result: any) => {
      mockClient.query.mockResolvedValueOnce(result)
    },
  }
}

/**
 * Generate test order data
 */
export function createTestOrder(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    order_number: `#${Date.now()}`,
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '+380501234567',
    delivery_method: 'courier',
    delivery_address: 'Test Address, 123',
    delivery_city: 'Kyiv',
    payment_method: 'liqpay',
    payment_status: 'pending',
    subtotal: 1000.00,
    discount_amount: 0,
    delivery_cost: 50.00,
    prepayment_amount: 500.00,
    total_amount: 1050.00,
    notes: 'Test order',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Generate test cart data
 */
export function createTestCart(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

/**
 * Generate test cart item
 */
export function createTestCartItem(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    cart_id: crypto.randomUUID(),
    product_id: crypto.randomUUID(),
    quantity: 1,
    color: 'black',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Generate test product data
 */
export function createTestProduct(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test product description',
    price: 1000.00,
    old_price: null,
    stock_quantity: 10,
    is_available: true,
    category: 'test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Mock fetch for external API calls
 */
export function mockFetch(response: any, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as Response)
}

/**
 * Reset all fetch mocks
 */
export function resetFetchMocks() {
  if (global.fetch && typeof (global.fetch as any).mockReset === 'function') {
    (global.fetch as jest.Mock).mockReset()
  }
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate LiqPay signature for testing
 */
export function generateLiqPaySignature(data: string, privateKey: string): string {
  const signString = privateKey + data + privateKey
  return crypto.createHash('sha1').update(signString).digest('base64')
}

/**
 * Generate Monobank RSA signature for testing
 */
export function generateMonobankSignature(data: string, privateKey: string): string {
  const sign = crypto.createSign('SHA256')
  sign.update(data)
  sign.end()
  return sign.sign(privateKey, 'base64')
}

/**
 * Create RSA key pair for testing Monobank signatures
 */
export function createTestKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })
}

/**
 * Mock response helpers
 */
export function createSuccessResponse(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Assert response shape
 */
export function assertErrorResponse(response: Response, expectedStatus: number, expectedMessage?: string) {
  expect(response.status).toBe(expectedStatus)
  if (expectedMessage) {
    expect(response).toHaveProperty('error')
  }
}

export function assertSuccessResponse(response: Response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus)
}
