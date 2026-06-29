import 'server-only';
import { db } from './db';
import { CATEGORY_DISPLAY_NAMES } from './category-utils';

const CATEGORY_CACHE_TTL_MS = 10 * 60 * 1000;

interface CategoryCacheEntry {
  categories: string[];
  cachedAt: number;
}

let categoryCache: CategoryCacheEntry | null = null;

export async function getCachedCategories(): Promise<string[]> {
  const now = Date.now();

  if (categoryCache && (now - categoryCache.cachedAt < CATEGORY_CACHE_TTL_MS)) {
    return categoryCache.categories;
  }

  try {
    const result = await db.query`
      SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category
    `;

    const categories = result.rows.map(row => row.category as string);

    categoryCache = { categories, cachedAt: now };

    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    if (categoryCache) return categoryCache.categories;
    return Object.keys(CATEGORY_DISPLAY_NAMES).filter(key => !key.includes(' ') && key.length > 2);
  }
}

export function invalidateCategoriesCache(): void {
  categoryCache = null;
}

export function isCategoryCacheStale(): boolean {
  if (!categoryCache) return true;
  return Date.now() - categoryCache.cachedAt >= CATEGORY_CACHE_TTL_MS;
}

export function getCategoryCacheTimestamp(): number | null {
  return categoryCache?.cachedAt || null;
}
