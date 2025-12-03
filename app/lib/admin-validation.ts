/**
 * Admin Panel Validation Schemas
 *
 * Zod schemas for admin panel forms and API requests
 */

import { z } from 'zod';

// =====================================================
// COMMON SCHEMAS
// =====================================================

/**
 * Sanitizes string input to prevent XSS attacks
 */
const sanitizedString = z.string().transform((val) => {
  return val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
});

/**
 * Email validation
 */
const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

/**
 * Password validation with strength requirements
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Positive number
 */
const positiveNumber = z.number().positive('Must be a positive number');

/**
 * Non-negative number
 */
const nonNegativeNumber = z.number().min(0, 'Must be non-negative');

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

/**
 * Admin login validation
 */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password change validation
 */
export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

/**
 * Password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset completion
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// =====================================================
// PRODUCT SCHEMAS
// =====================================================

/**
 * Product image schema
 */
const productImageSchema = z.object({
  id: z.number().optional(),
  image_url: z.string().url('Invalid image URL').max(500),
  alt: z.string().max(255).default(''),
  is_primary: z.boolean().default(false),
});

/**
 * Product color schema
 */
const productColorSchema = z.object({
  color: z.string().min(1).max(100),
  image_url: z.string().url('Invalid image URL').max(500),
});

/**
 * Dimensions schema
 */
const dimensionsSchema = z.object({
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  height: z.number().positive().optional(),
  sleeping_area: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
  }).optional(),
}).optional();

/**
 * Material schema for sofas
 */
const sofaMaterialSchema = z.object({
  type: z.string().max(100),
  composition: z.string().max(255).optional(),
  backrest_filling: z.string().max(255).optional(),
  covers: z.string().max(255).optional(),
});

/**
 * Inner material schema
 */
const innerMaterialSchema = z.object({
  structure: z.string().max(255),
  cushion_filling: z.string().max(255),
}).optional();

/**
 * Product specs schema
 */
const productSpecsSchema = z.object({
  dimensions: dimensionsSchema,
  material: z.union([z.string().max(100), sofaMaterialSchema]).optional(),
  types: z.array(z.string().max(50)).optional(),
  construction: z.string().max(255).optional(),
  inner_material: innerMaterialSchema,
  additional_features: z.string().max(1000).optional(),
  has_shelves: z.boolean().optional(),
  leg_height: z.string().max(50).optional(),
  has_lift_mechanism: z.boolean().optional(),
  armrest_type: z.string().max(100).optional(),
  seat_height: z.number().positive().optional(),
  headboard_type: z.string().max(100).optional(),
  storage_options: z.string().max(255).optional(),
  type: z.string().max(50).optional(),
  firmness: z.string().max(50).optional(),
  thickness: z.number().positive().optional(),
  core_type: z.string().max(100).optional(),
  hardness: z.string().max(50).optional(),
  shape: z.string().max(50).optional(),
  extendable: z.boolean().optional(),
  upholstery: z.string().max(100).optional(),
  weight_capacity: z.number().positive().optional(),
  door_count: z.number().int().positive().optional(),
  door_type: z.string().max(50).optional(),
  internal_layout: z.string().max(500).optional(),
  mounting_type: z.string().max(100).optional(),
  shelf_count: z.number().int().min(0).optional(),
}).optional();

/**
 * Product creation/update schema
 */
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .pipe(sanitizedString),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug too long')
    .regex(/^[a-z0-9а-яіїєґ-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string()
    .max(5000, 'Description too long')
    .pipe(sanitizedString)
    .optional()
    .default(''),
  category: z.enum([
    'sofas', 'corner_sofas', 'sofa_beds', 'beds',
    'tables', 'chairs', 'mattresses', 'wardrobes', 'accessories'
  ]),
  price: positiveNumber.max(1000000, 'Price too high'),
  sale_price: z.number().positive().max(1000000).nullable().optional(),
  stock: nonNegativeNumber.max(99999, 'Stock too high').int(),
  is_on_sale: z.boolean().optional().default(false),
  is_new: z.boolean().optional().default(false),
  is_bestseller: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
  images: z.array(productImageSchema).optional().default([]),
  colors: z.array(productColorSchema).optional().default([]),
  specs: productSpecsSchema,
});

/**
 * Product ID validation
 */
export const productIdSchema = z.object({
  productId: z.coerce.number().int().positive('Invalid product ID'),
});

/**
 * Product stock update
 */
export const stockUpdateSchema = z.object({
  stock: nonNegativeNumber.max(99999, 'Stock too high').int(),
});

/**
 * Product price update
 */
export const priceUpdateSchema = z.object({
  price: positiveNumber.max(1000000, 'Price too high'),
});

/**
 * Bulk product import row
 */
export const csvProductRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional().default(''),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative').optional().default(0),
  is_on_sale: z.coerce.boolean().optional().default(false),
  is_new: z.coerce.boolean().optional().default(false),
  is_bestseller: z.coerce.boolean().optional().default(false),
});

// =====================================================
// ORDER SCHEMAS
// =====================================================

/**
 * Order status values
 */
export const orderStatusEnum = z.enum([
  'processing',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);

/**
 * Payment status values
 */
export const paymentStatusEnum = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
]);

/**
 * Order status update schema
 */
export const orderStatusUpdateSchema = z.object({
  order_status: orderStatusEnum,
});

/**
 * Order payment status update
 */
export const orderPaymentUpdateSchema = z.object({
  payment_status: paymentStatusEnum,
});

/**
 * Order tracking update
 */
export const orderTrackingSchema = z.object({
  tracking_number: z.string()
    .max(100, 'Tracking number too long')
    .pipe(sanitizedString)
    .optional(),
  admin_notes: z.string()
    .max(1000, 'Notes too long')
    .pipe(sanitizedString)
    .optional(),
});

/**
 * Order ID validation
 */
export const orderIdSchema = z.object({
  orderId: uuidSchema,
});

// =====================================================
// PAGINATION & FILTERING
// =====================================================

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
});

/**
 * Product list filters
 */
export const productFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['name', 'price', 'stock', 'created_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  is_active: z.coerce.boolean().optional(),
  low_stock: z.coerce.boolean().optional(), // Show only products with stock < 10
});

/**
 * Order list filters
 */
export const orderFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: orderStatusEnum.optional(),
  payment_status: paymentStatusEnum.optional(),
  search: z.string().max(100).optional(), // Search by order number, email, phone
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['created_at', 'total_amount', 'order_number']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// =====================================================
// ADMIN USER MANAGEMENT
// =====================================================

/**
 * Create admin user schema
 */
export const createAdminUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: z.string().max(100, 'First name too long').pipe(sanitizedString).optional(),
  last_name: z.string().max(100, 'Last name too long').pipe(sanitizedString).optional(),
  role: z.enum(['admin', 'manager']),
});

/**
 * Update admin user schema
 */
export const updateAdminUserSchema = z.object({
  email: emailSchema.optional(),
  first_name: z.string().max(100, 'First name too long').pipe(sanitizedString).optional(),
  last_name: z.string().max(100, 'Last name too long').pipe(sanitizedString).optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['admin', 'manager']).optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

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

/**
 * Format Zod validation errors for display
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// Export types
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type OrderPaymentUpdate = z.infer<typeof orderPaymentUpdateSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;
