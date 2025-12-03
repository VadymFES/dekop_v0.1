// Category utility functions for displaying Ukrainian category names

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
