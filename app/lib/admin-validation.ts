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
  .email('Невірний формат електронної пошти')
  .max(255, 'Електронна пошта занадто довга')
  .toLowerCase()
  .trim();

/**
 * Password validation with strength requirements
 */
const passwordSchema = z.string()
  .min(8, 'Пароль має містити мінімум 8 символів')
  .max(128, 'Пароль занадто довгий');

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid('Невірний формат UUID');

/**
 * Positive number
 */
const positiveNumber = z.number().positive('Має бути додатним числом');

/**
 * Non-negative number
 */
const nonNegativeNumber = z.number().min(0, 'Має бути невід\'ємним числом');

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

/**
 * Admin login validation
 */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обов\'язковий'),
});

/**
 * Password change validation
 */
export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Поточний пароль обов\'язковий'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Паролі не співпадають',
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
  token: z.string().min(1, 'Токен обов\'язковий'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Паролі не співпадають',
  path: ['confirm_password'],
});

// =====================================================
// PRODUCT SCHEMAS
// =====================================================

/**
 * Product image schema
 * Note: image_url can be empty string (will be filtered out during insert)
 * color: Links image to a specific product color variant (null = general image for all colors)
 */
const productImageSchema = z.object({
  id: z.number().optional(),
  image_url: z.string().max(500).refine(
    (val) => val === '' || /^https?:\/\/.+/.test(val),
    { message: 'Має бути порожнім або дійсною URL-адресою' }
  ),
  alt: z.string().max(255).default(''),
  is_primary: z.boolean().default(false),
  color: z.string().max(100).nullable().optional(),
});

/**
 * Product color schema
 * Note: Both fields required for valid color entry
 */
const productColorSchema = z.object({
  color: z.string().max(100).default(''),
  image_url: z.string().max(500).refine(
    (val) => val === '' || /^https?:\/\/.+/.test(val),
    { message: 'Має бути порожнім або дійсною URL-адресою' }
  ),
});

/**
 * Dimensions schema
 * All fields are optional and allow 0 or positive values
 * Uses coerce to handle string inputs from forms
 */
const dimensionsSchema = z.object({
  length: z.coerce.number().min(0).optional().nullable(),
  width: z.coerce.number().min(0).optional().nullable(),
  depth: z.coerce.number().min(0).optional().nullable(),
  height: z.coerce.number().min(0).optional().nullable(),
  sleeping_area: z.object({
    width: z.coerce.number().min(0).optional().default(0),
    length: z.coerce.number().min(0).optional().default(0),
  }).optional().nullable(),
}).optional().nullable();

/**
 * Material schema for sofas
 * All fields are optional to allow partial data
 */
const sofaMaterialSchema = z.object({
  type: z.string().max(100).optional().default(''),
  composition: z.string().max(255).optional().nullable().default(''),
  backrest_filling: z.string().max(255).optional().nullable().default(''),
  covers: z.string().max(255).optional().nullable().default(''),
}).optional().nullable();

/**
 * Inner material schema
 * All fields are optional to allow partial data
 */
const innerMaterialSchema = z.object({
  structure: z.string().max(255).optional().nullable().default(''),
  cushion_filling: z.string().max(255).optional().nullable().default(''),
}).optional().nullable();

/**
 * Product specs schema
 * All fields are optional and lenient to allow partial product data
 * Uses coerce for numeric fields to handle string inputs from forms
 */
const productSpecsSchema = z.object({
  dimensions: dimensionsSchema,
  material: z.union([z.string().max(100), sofaMaterialSchema]).optional().nullable(),
  types: z.array(z.string().max(50)).optional().nullable(),
  construction: z.string().max(255).optional().nullable(),
  inner_material: innerMaterialSchema,
  additional_features: z.string().max(1000).optional().nullable(),
  has_shelves: z.boolean().optional().nullable(),
  leg_height: z.string().max(50).optional().nullable(),
  has_lift_mechanism: z.boolean().optional().nullable(),
  armrest_type: z.string().max(100).optional().nullable(),
  seat_height: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().min(0).optional().nullable()
  ),
  headboard_type: z.string().max(100).optional().nullable(),
  storage_options: z.string().max(255).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  firmness: z.string().max(50).optional().nullable(),
  thickness: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().min(0).optional().nullable()
  ),
  core_type: z.string().max(100).optional().nullable(),
  hardness: z.string().max(50).optional().nullable(),
  shape: z.string().max(50).optional().nullable(),
  extendable: z.boolean().optional().nullable(),
  upholstery: z.string().max(100).optional().nullable(),
  weight_capacity: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().min(0).optional().nullable()
  ),
  door_count: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().int().min(0).optional().nullable()
  ),
  door_type: z.string().max(50).optional().nullable(),
  internal_layout: z.string().max(500).optional().nullable(),
  mounting_type: z.string().max(100).optional().nullable(),
  shelf_count: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().int().min(0).optional().nullable()
  ),
  // Allow any additional fields from the database
  category: z.string().optional().nullable(),
}).passthrough().optional().nullable();

/**
 * Product creation/update schema
 * Made more lenient to allow partial updates and empty values
 */
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Назва товару обов\'язкова')
    .max(255, 'Назва занадто довга (максимум 255 символів)')
    .transform((val) => val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '')),
  slug: z.string()
    .min(1, 'URL (slug) обов\'язковий')
    .max(255, 'URL занадто довгий (максимум 255 символів)')
    .regex(/^[a-z0-9а-яіїєґ-]+$/, 'URL може містити лише малі літери, цифри та дефіси'),
  description: z.string()
    .max(5000, 'Опис занадто довгий (максимум 5000 символів)')
    .transform((val) => val.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, ''))
    .optional()
    .nullable()
    .default(''),
  category: z.preprocess(
    (val) => typeof val === 'string' ? val.trim().toLowerCase() : val,
    z.enum([
      'sofas', 'corner_sofas', 'sofa_beds', 'beds',
      'tables', 'chairs', 'mattresses', 'wardrobes', 'accessories'
    ], { message: 'Оберіть категорію товару' })
  ),
  price: z.coerce.number().min(0.01, 'Ціна має бути більше 0').max(1000000, 'Ціна занадто велика'),
  sale_price: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().min(0, 'Ціна зі знижкою не може бути від\'ємною').max(1000000, 'Ціна зі знижкою занадто велика').nullable().optional()
  ),
  stock: z.coerce.number().min(0, 'Запас не може бути від\'ємним').max(99999, 'Запас занадто великий').int('Запас має бути цілим числом'),
  is_on_sale: z.boolean().optional().nullable().default(false),
  is_new: z.boolean().optional().nullable().default(false),
  is_bestseller: z.boolean().optional().nullable().default(false),
  images: z.array(productImageSchema).optional().nullable().default([]),
  colors: z.array(productColorSchema).optional().nullable().default([]),
  specs: productSpecsSchema,
});

/**
 * Product ID validation
 */
export const productIdSchema = z.object({
  productId: z.coerce.number().int().positive('Невірний ID товару'),
});

/**
 * Product stock update
 */
export const stockUpdateSchema = z.object({
  stock: nonNegativeNumber.max(99999, 'Запас занадто великий').int('Запас має бути цілим числом'),
});

/**
 * Product price update
 */
export const priceUpdateSchema = z.object({
  price: positiveNumber.max(1000000, 'Ціна занадто велика'),
});

/**
 * Bulk product import row
 */
export const csvProductRowSchema = z.object({
  name: z.string().min(1, 'Назва обов\'язкова'),
  slug: z.string().optional(),
  description: z.string().optional().default(''),
  category: z.string().min(1, 'Категорія обов\'язкова'),
  price: z.coerce.number().positive('Ціна має бути додатною'),
  stock: z.coerce.number().int().min(0, 'Запас не може бути від\'ємним').optional().default(0),
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
    .max(100, 'Номер відстеження занадто довгий')
    .pipe(sanitizedString)
    .optional(),
  admin_notes: z.string()
    .max(1000, 'Нотатки занадто довгі')
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
  page: z.coerce.number().int().min(1, 'Сторінка має бути мінімум 1').optional().default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Ліміт не може перевищувати 100').optional().default(20),
});

/**
 * Product list filters
 */
export const productFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['name', 'price', 'stock', 'category', 'updated_at', 'created_at', 'is_on_sale', 'is_new', 'is_bestseller']).optional().default('created_at'),
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
  first_name: z.string().max(100, 'Ім\'я занадто довге').pipe(sanitizedString).optional(),
  last_name: z.string().max(100, 'Прізвище занадто довге').pipe(sanitizedString).optional(),
  role: z.enum(['admin', 'manager'], { message: 'Оберіть роль' }),
});

/**
 * Update admin user schema
 */
export const updateAdminUserSchema = z.object({
  email: emailSchema.optional(),
  first_name: z.string().max(100, 'Ім\'я занадто довге').pipe(sanitizedString).optional(),
  last_name: z.string().max(100, 'Прізвище занадто довге').pipe(sanitizedString).optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['admin', 'manager'], { message: 'Оберіть роль' }).optional(),
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
