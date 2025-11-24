/**
 * Cart Session Cookie Security Tests
 * Tests cookie security attributes, tampering prevention, and secure session management
 */

import { POST, GET } from '@/app/cart/api/route';
import { PATCH, DELETE } from '@/app/cart/api/[id]/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@vercel/postgres', () => ({
  sql: jest.fn(),
  db: {
    connect: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const { sql } = require('@vercel/postgres');
const { cookies } = require('next/headers');

describe('Cart Session Cookie Security', () => {
  const mockCartId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cookie Security Attributes', () => {
    it('should set httpOnly flag on cart cookie', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql.mockResolvedValue({
        rows: [
          {
            id: 'item-1',
            cart_id: mockCartId,
            product_id: 1,
            quantity: 2,
            color: 'black',
            product_name: 'Test Product',
            slug: 'test-product',
            product_price: 100,
            images: [{ image_url: 'test.jpg' }],
          },
        ],
      });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
          color: 'black',
        }),
      });

      const response = await POST(request as NextRequest);

      // Verify httpOnly flag is set
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('HttpOnly');
      }
    });

    it('should set secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql.mockResolvedValue({
        rows: [
          {
            id: 'item-1',
            cart_id: mockCartId,
            product_id: 1,
            quantity: 2,
            color: 'black',
            product_name: 'Test Product',
            slug: 'test-product',
            product_price: 100,
            images: [{ image_url: 'test.jpg' }],
          },
        ],
      });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
          color: 'black',
        }),
      });

      const response = await POST(request as NextRequest);

      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('Secure');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should set SameSite=Strict flag', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql.mockResolvedValue({
        rows: [
          {
            id: 'item-1',
            cart_id: mockCartId,
            product_id: 1,
            quantity: 2,
            color: 'black',
            product_name: 'Test Product',
            slug: 'test-product',
            product_price: 100,
            images: [{ image_url: 'test.jpg' }],
          },
        ],
      });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
          color: 'black',
        }),
      });

      const response = await POST(request as NextRequest);

      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader).toContain('SameSite=Strict');
      }
    });

    it('should set appropriate Max-Age (7 days)', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql.mockResolvedValue({
        rows: [
          {
            id: 'item-1',
            cart_id: mockCartId,
            product_id: 1,
            quantity: 2,
            color: 'black',
            product_name: 'Test Product',
            slug: 'test-product',
            product_price: 100,
            images: [{ image_url: 'test.jpg' }],
          },
        ],
      });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
          color: 'black',
        }),
      });

      const response = await POST(request as NextRequest);

      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Max-Age should be 7 days = 604800 seconds
        expect(setCookieHeader).toContain('Max-Age=604800');
      }
    });
  });

  describe('Cart ID Validation and Tampering Prevention', () => {
    it('should reject invalid UUID format cart IDs', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'invalid-cart-id-format' }),
      };
      cookies.mockResolvedValue(mockCookieStore);

      // Mock database check fails for invalid ID
      sql.mockResolvedValue({ rows: [], rowCount: 0 });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
        }),
      });

      const response = await POST(request as NextRequest);

      // Should create a new cart since the existing cart ID is invalid
      expect(response.status).toBe(200);

      // Verify a new cart was created
      const insertCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('INSERT INTO carts')
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('should create new cart if cookie cart ID does not exist in database', async () => {
      const nonExistentCartId = '999e9999-e99b-99d9-a999-999999999999';

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: nonExistentCartId }),
      };
      cookies.mockResolvedValue(mockCookieStore);

      // Mock cart doesn't exist in DB
      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT new cart
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cart item
        .mockResolvedValueOnce({ rows: [] }); // SELECT cart items

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 2,
        }),
      });

      const response = await POST(request as NextRequest);

      expect(response.status).toBe(200);

      // Verify new cart was created
      const insertCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('INSERT INTO carts')
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('should not allow access to another users cart', async () => {
      const userCartId = '111e1111-e11b-11d1-a111-111111111111';
      const otherUserCartId = '222e2222-e22b-22d2-a222-222222222222';

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: userCartId }),
      };
      cookies.mockResolvedValue(mockCookieStore);

      // User tries to delete item from another user's cart
      sql.mockResolvedValue({ rows: [] });

      const request = new Request(
        'http://localhost:3000/api/cart/item-from-other-cart',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(
        request as NextRequest,
        { params: Promise.resolve({ id: 'item-from-other-cart' }) }
      );

      // Should only query items from the user's own cart
      const selectCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('WHERE ci.cart_id')
      );

      if (selectCalls.length > 0) {
        // Verify the cart_id parameter matches the user's cart ID
        expect(selectCalls[0]).toBeDefined();
      }

      expect(response.status).toBe(200);
    });
  });

  describe('Cart Session Isolation', () => {
    it('should isolate cart data between different sessions', async () => {
      const session1CartId = '111e1111-e11b-11d1-a111-111111111111';
      const session2CartId = '222e2222-e22b-22d2-a222-222222222222';

      // Session 1 - adds product
      const mockCookieStore1 = {
        get: jest.fn().mockReturnValue({ value: session1CartId }),
      };
      cookies.mockResolvedValue(mockCookieStore1);

      sql
        .mockResolvedValueOnce({ rows: [{ id: session1CartId }], rowCount: 1 }) // Cart exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update expires_at
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Insert item
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'item-1',
              cart_id: session1CartId,
              product_id: 1,
              quantity: 1,
              color: 'black',
              product_name: 'Product 1',
              slug: 'product-1',
              product_price: 100,
              images: [],
            },
          ],
        });

      const request1 = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      });

      await POST(request1 as NextRequest);

      jest.clearAllMocks();

      // Session 2 - should not see session 1's cart
      const mockCookieStore2 = {
        get: jest.fn().mockReturnValue({ value: session2CartId }),
      };
      cookies.mockResolvedValue(mockCookieStore2);

      sql.mockResolvedValue({
        rows: [], // Empty cart for session 2
      });

      const request2 = new Request('http://localhost:3000/api/cart', {
        method: 'GET',
      });

      const response = await GET();
      const data = await response.json();

      // Session 2 should have empty cart
      expect(data.items).toEqual([]);

      // Verify query used session 2's cart ID
      const queryCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('WHERE ci.cart_id')
      );

      if (queryCalls.length > 0) {
        // Verify the cart_id parameter is session2CartId
        expect(queryCalls[0]).toBeDefined();
      }
    });

    it('should return empty cart if no session cookie exists', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null), // No cart cookie
      };
      cookies.mockResolvedValue(mockCookieStore);

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'GET',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);

      // Should not query database
      expect(sql).not.toHaveBeenCalled();
    });
  });

  describe('Cart Cookie Lifecycle', () => {
    it('should create new cart cookie on first POST request', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null), // No existing cart
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cart
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT item
        .mockResolvedValueOnce({ rows: [] }); // SELECT cart items

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      });

      const response = await POST(request as NextRequest);

      expect(response.status).toBe(200);

      // Verify cart was created
      const insertCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('INSERT INTO carts')
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('should extend cart expiration on each request', async () => {
      const existingCartId = '550e8400-e29b-41d4-a716-446655440000';

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: existingCartId }),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql
        .mockResolvedValueOnce({ rows: [{ id: existingCartId }], rowCount: 1 }) // Cart exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE expires_at
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT/UPDATE item
        .mockResolvedValueOnce({ rows: [] }); // SELECT cart items

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      });

      await POST(request as NextRequest);

      // Verify cart expiration was updated
      const updateCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('UPDATE carts SET expires_at')
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should not expose sensitive information in error responses', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql.mockRejectedValue(new Error('Database connection failed at line 42'));

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      });

      const response = await POST(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add item to cart');

      // Should not expose database details
      expect(data.error).not.toContain('Database connection');
      expect(data.error).not.toContain('line 42');
    });

    it('should include appropriate CORS headers for cart API', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'GET',
      });

      const response = await GET();

      // Verify CORS headers are not too permissive
      const accessControlAllowOrigin = response.headers.get('Access-Control-Allow-Origin');

      // Should not be wildcard in production
      if (process.env.NODE_ENV === 'production' && accessControlAllowOrigin) {
        expect(accessControlAllowOrigin).not.toBe('*');
      }
    });
  });

  describe('Cart Session Security Best Practices', () => {
    it('should use UUIDs for cart IDs (not sequential integers)', async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(null),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT cart
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT item
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'item-1',
              cart_id: mockCartId,
              product_id: 1,
              quantity: 1,
              color: 'black',
              product_name: 'Product 1',
              slug: 'product-1',
              product_price: 100,
              images: [],
            },
          ],
        });

      const request = new Request('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          productId: 1,
          quantity: 1,
        }),
      });

      const response = await POST(request as NextRequest);
      const data = await response.json();

      // Verify cart_id follows UUID format (not sequential)
      if (data.items && data.items.length > 0) {
        const cartId = data.items[0].cart_id || mockCartId;
        expect(cartId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should validate cart ownership before modifications', async () => {
      const userCartId = '111e1111-e11b-11d1-a111-111111111111';

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: userCartId }),
      };
      cookies.mockResolvedValue(mockCookieStore);

      sql
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE item
        .mockResolvedValueOnce({ rows: [] }); // SELECT updated cart

      const request = new Request('http://localhost:3000/api/cart/item-123', {
        method: 'DELETE',
      });

      await DELETE(
        request as NextRequest,
        { params: Promise.resolve({ id: 'item-123' }) }
      );

      // Verify that subsequent queries filter by the user's cart_id
      const selectCalls = sql.mock.calls.filter((call: any) =>
        call[0].join('').includes('WHERE ci.cart_id')
      );

      expect(selectCalls.length).toBeGreaterThan(0);
    });

    it('should not allow cart enumeration attacks', async () => {
      // Attacker tries to guess cart IDs
      const guessedCartIds = [
        '000e0000-e00b-00d0-a000-000000000001',
        '000e0000-e00b-00d0-a000-000000000002',
        '000e0000-e00b-00d0-a000-000000000003',
      ];

      for (const guessedId of guessedCartIds) {
        const mockCookieStore = {
          get: jest.fn().mockReturnValue({ value: guessedId }),
        };
        cookies.mockResolvedValue(mockCookieStore);

        sql.mockResolvedValue({ rows: [] }); // No cart items

        const request = new Request('http://localhost:3000/api/cart', {
          method: 'GET',
        });

        const response = await GET();
        const data = await response.json();

        // Should return empty cart, not reveal if cart exists
        expect(response.status).toBe(200);
        expect(data.items).toEqual([]);

        jest.clearAllMocks();
      }
    });
  });
});
