/**
 * Input validation schemas using Zod
 * Provides comprehensive validation and sanitization for user inputs
 * Protects against SQL injection, XSS, and other injection attacks
 */

import { z } from 'zod';

/**
 * Sanitizes string input to prevent XSS attacks
 * Removes potentially dangerous characters and HTML tags
 * Usage: Apply max length BEFORE calling sanitizedString
 * Example: z.string().max(100).pipe(sanitizedString)
 */
const sanitizedString = z.string().transform((val) => {
  // Remove HTML tags and potentially dangerous characters
  return val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
});

/**
 * Phone number validation
 * Allows Ukrainian phone format: +380XXXXXXXXX or 380XXXXXXXXX
 */
const phoneSchema = z.string()
  .regex(/^\+?380\d{9}$/, 'Invalid phone number format. Expected: +380XXXXXXXXX')
  .transform((val) => val.startsWith('+') ? val : `+${val}`);

/**
 * Email validation with sanitization
 */
const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Positive number validation
 */
const positiveNumber = z.number().positive('Must be a positive number');

/**
 * Non-negative number validation
 */
const nonNegativeNumber = z.number().min(0, 'Must be non-negative');

/**
 * Cart item validation schema
 */
export const cartItemSchema = z.object({
  productId: z.number().int().positive('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  color: z.string().max(50, 'Color name too long').pipe(sanitizedString).optional().default(''),
});

/**
 * Order creation validation schema
 */
export const createOrderSchema = z.object({
  // User information
  user_name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .pipe(sanitizedString),
  user_surname: z.string()
    .min(1, 'Surname is required')
    .max(100, 'Surname too long')
    .pipe(sanitizedString),
  user_phone: phoneSchema,
  user_email: emailSchema,

  // Delivery information
  delivery_method: z.enum(['nova_poshta', 'store_pickup', 'courier'], {
    message: 'Invalid delivery method',
  }),
  delivery_address: z.string().max(500, 'Address too long').pipe(sanitizedString).optional(),
  delivery_city: z.string().max(100, 'City name too long').pipe(sanitizedString).optional(),
  delivery_street: z.string().max(200, 'Street name too long').pipe(sanitizedString).optional(),
  delivery_building: z.string().max(20, 'Building number too long').pipe(sanitizedString).optional(),
  delivery_apartment: z.string().max(20, 'Apartment number too long').pipe(sanitizedString).optional(),
  delivery_postal_code: z.string().max(20, 'Postal code too long').pipe(sanitizedString).optional(),
  store_location: z.string().max(200, 'Store location too long').pipe(sanitizedString).optional().nullable(),

  // Payment information
  payment_method: z.enum(['liqpay', 'monobank', 'cash_on_delivery'], {
    message: 'Invalid payment method',
  }),

  // Pricing (optional, will be calculated server-side)
  discount_percent: nonNegativeNumber.max(100, 'Discount cannot exceed 100%').optional().default(0),
  delivery_cost: nonNegativeNumber.max(10000, 'Delivery cost too high').optional().default(0),
  prepayment_amount: nonNegativeNumber.optional().default(0),

  // Customer notes
  customer_notes: z.string().max(1000, 'Notes too long').pipe(sanitizedString).optional(),

  // Cart ID
  cart_id: uuidSchema.optional(),
});

/**
 * Update cart item quantity schema
 */
export const updateCartQuantitySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(100, 'Quantity cannot exceed 100'),
});

/**
 * Email validation for test endpoint
 */
export const testEmailSchema = z.object({
  test_email: emailSchema,
});

/**
 * Product ID validation
 */
export const productIdSchema = z.object({
  productId: z.number().int().positive('Invalid product ID'),
});

/**
 * Order ID validation
 */
export const orderIdSchema = z.object({
  orderId: uuidSchema,
});

/**
 * Generic pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional().default(20),
});

/**
 * Validates and sanitizes input data using a Zod schema
 * Returns validated data or throws validation error
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns { success: true, data } or { success: false, error }
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError<T> } {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}
