// Category utility functions for displaying Ukrainian category names
// Includes caching for static data (Task 3)

import { db } from './db';

// =====================================================
// STATIC DATA CACHE (Task 3)
// =====================================================

// Cache configuration
const CATEGORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ORDER_STATUS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Category cache
interface CategoryCacheEntry {
  categories: string[];
  cachedAt: number;
}

let categoryCache: CategoryCacheEntry | null = null;

// Order status cache
interface OrderStatusCacheEntry {
  statuses: { value: string; label: string }[];
  cachedAt: number;
}

let orderStatusCache: OrderStatusCacheEntry | null = null;

// Payment status cache
interface PaymentStatusCacheEntry {
  statuses: { value: string; label: string }[];
  cachedAt: number;
}

let paymentStatusCache: PaymentStatusCacheEntry | null = null;

/**
 * Get cached product categories list
 * Returns cached value if within TTL, otherwise fetches fresh from DB
 */
export async function getCachedCategories(): Promise<string[]> {
  const now = Date.now();

  // Check if cache is valid
  if (categoryCache && (now - categoryCache.cachedAt < CATEGORY_CACHE_TTL_MS)) {
    const ageSeconds = Math.round((now - categoryCache.cachedAt) / 1000);
    console.log(`[CategoryCache] HIT - ${categoryCache.categories.length} categories (age: ${ageSeconds}s)`);
    return categoryCache.categories;
  }

  console.log(`[CategoryCache] MISS - fetching from database`);

  // Fetch fresh from database
  try {
    const result = await db.query`
      SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category
    `;

    const categories = result.rows.map(row => row.category as string);

    // Update cache
    categoryCache = {
      categories,
      cachedAt: now,
    };

    console.log(`[CategoryCache] CACHED - ${categories.length} categories`);

    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    // Return cached value if available, even if stale
    if (categoryCache) {
      return categoryCache.categories;
    }
    // Return static fallback
    return Object.keys(CATEGORY_DISPLAY_NAMES).filter(key => !key.includes(' ') && key.length > 2);
  }
}

/**
 * Invalidate categories cache
 * Call this on product create/update/delete that changes category
 */
export function invalidateCategoriesCache(): void {
  categoryCache = null;
}

/**
 * Get cached order status options
 */
export function getCachedOrderStatuses(): { value: string; label: string }[] {
  const now = Date.now();

  // Check if cache is valid
  if (orderStatusCache && (now - orderStatusCache.cachedAt < ORDER_STATUS_CACHE_TTL_MS)) {
    return orderStatusCache.statuses;
  }

  // Static order statuses (no DB fetch needed - they're application constants)
  const statuses = [
    { value: 'processing', label: 'В обробці' },
    { value: 'confirmed', label: 'Підтверджено' },
    { value: 'shipped', label: 'Відправлено' },
    { value: 'delivered', label: 'Доставлено' },
    { value: 'cancelled', label: 'Скасовано' },
  ];

  // Update cache
  orderStatusCache = {
    statuses,
    cachedAt: now,
  };

  return statuses;
}

/**
 * Get cached payment status options
 */
export function getCachedPaymentStatuses(): { value: string; label: string }[] {
  const now = Date.now();

  // Check if cache is valid
  if (paymentStatusCache && (now - paymentStatusCache.cachedAt < ORDER_STATUS_CACHE_TTL_MS)) {
    return paymentStatusCache.statuses;
  }

  // Static payment statuses (no DB fetch needed - they're application constants)
  const statuses = [
    { value: 'pending', label: 'Очікує' },
    { value: 'paid', label: 'Оплачено' },
    { value: 'failed', label: 'Помилка' },
    { value: 'refunded', label: 'Повернення' },
  ];

  // Update cache
  paymentStatusCache = {
    statuses,
    cachedAt: now,
  };

  return statuses;
}

/**
 * Check if category cache is stale (for monitoring/debugging)
 */
export function isCategoryCacheStale(): boolean {
  if (!categoryCache) return true;
  return Date.now() - categoryCache.cachedAt >= CATEGORY_CACHE_TTL_MS;
}

/**
 * Get cache timestamp (for debugging)
 */
export function getCategoryCacheTimestamp(): number | null {
  return categoryCache?.cachedAt || null;
}

// =====================================================
// CATEGORY MAPPINGS
// =====================================================

// Mapping from English DB category to Ukrainian display name
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'sofas': 'Дивани',
  'corner_sofas': 'Кутові дивани',
  'sofa_beds': 'Дивани-ліжка',
  'beds': 'Ліжка',
  'tables': 'Столи',
  'chairs': 'Стільці',
  'mattresses': 'Матраци',
  'wardrobes': 'Шафи',
  'accessories': 'Аксесуари',
  // Ukrainian inputs (for backwards compatibility)
  'диван': 'Дивани',
  'дивани': 'Дивани',
  'кутовий диван': 'Кутові дивани',
  'кутові дивани': 'Кутові дивани',
  'диван-ліжко': 'Дивани-ліжка',
  'дивани-ліжка': 'Дивани-ліжка',
  'ліжко': 'Ліжка',
  'ліжка': 'Ліжка',
  'стіл': 'Столи',
  'столи': 'Столи',
  'стілець': 'Стільці',
  'стільці': 'Стільці',
  'матрац': 'Матраци',
  'матраци': 'Матраци',
  'шафа': 'Шафи',
  'шафи': 'Шафи',
  'аксесуар': 'Аксесуари',
  'аксесуари': 'Аксесуари',
};

// Mapping from Ukrainian to English for spec table lookups
export const CATEGORY_TO_ENGLISH: Record<string, string> = {
  // English pass-through
  'sofas': 'sofas',
  'corner_sofas': 'corner_sofas',
  'sofa_beds': 'sofa_beds',
  'beds': 'beds',
  'tables': 'tables',
  'chairs': 'chairs',
  'mattresses': 'mattresses',
  'wardrobes': 'wardrobes',
  'accessories': 'accessories',
  // Ukrainian singular
  'диван': 'sofas',
  'кутовий диван': 'corner_sofas',
  'диван-ліжко': 'sofa_beds',
  'ліжко': 'beds',
  'стіл': 'tables',
  'стілець': 'chairs',
  'матрац': 'mattresses',
  'шафа': 'wardrobes',
  'аксесуар': 'accessories',
  // Ukrainian plural
  'дивани': 'sofas',
  'кутові дивани': 'corner_sofas',
  'дивани-ліжка': 'sofa_beds',
  'ліжка': 'beds',
  'столи': 'tables',
  'стільці': 'chairs',
  'матраци': 'mattresses',
  'шафи': 'wardrobes',
  'аксесуари': 'accessories',
};

/**
 * Normalize category to English for spec table lookups
 * @param category - Category name (English or Ukrainian)
 * @returns English category key
 */
export function normalizeCategoryToEnglish(category: string | undefined | null): string {
  if (!category) return '';
  const lowerCategory = category.toLowerCase().trim();
  return CATEGORY_TO_ENGLISH[lowerCategory] || category;
}

// Mapping from English DB category to URL slug (camelCase)
export const CATEGORY_URL_SLUGS: Record<string, string> = {
  'sofas': 'sofas',
  'corner_sofas': 'cornerSofas',
  'sofa_beds': 'sofaBeds',
  'beds': 'beds',
  'tables': 'tables',
  'chairs': 'chairs',
  'mattresses': 'mattresses',
  'wardrobes': 'wardrobes',
  'accessories': 'accessories',
};

/**
 * Get Ukrainian display name for a category
 * @param category - Category name (English or Ukrainian)
 * @returns Ukrainian display name
 */
export function getCategoryDisplayName(category: string | undefined | null): string {
  if (!category) return 'Категорія';

  const lowerCategory = category.toLowerCase().trim();
  return CATEGORY_DISPLAY_NAMES[lowerCategory] || category;
}

/**
 * Get URL slug for a category (for catalog links)
 * @param category - Category name (English or Ukrainian)
 * @returns URL-safe slug for catalog
 */
export function getCategoryUrlSlug(category: string | undefined | null): string {
  if (!category) return '';

  const lowerCategory = category.toLowerCase().trim();

  // If it's already an English category, convert to URL slug
  if (CATEGORY_URL_SLUGS[lowerCategory]) {
    return CATEGORY_URL_SLUGS[lowerCategory];
  }

  // Try to find by matching Ukrainian name
  for (const [englishKey, displayName] of Object.entries(CATEGORY_DISPLAY_NAMES)) {
    if (displayName.toLowerCase() === lowerCategory || englishKey === lowerCategory) {
      return CATEGORY_URL_SLUGS[englishKey] || englishKey;
    }
  }

  return category;
}
