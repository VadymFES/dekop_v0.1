// Keyword mappings for intelligent search suggestions

export interface CategorySuggestion {
  slug: string;
  name: string;
  keywords: string[];
}

export interface FilterSuggestion {
  type: 'status' | 'type' | 'material' | 'feature';
  value: string;
  label: string;
  keywords: string[];
}

// Category keyword mappings
export const CATEGORY_KEYWORDS: CategorySuggestion[] = [
  {
    slug: 'tables',
    name: 'Столи',
    keywords: ['стіл', 'столи', 'столів', 'table', 'обідній', 'кухонний стіл', 'робочий стіл']
  },
  {
    slug: 'chairs',
    name: 'Стільці',
    keywords: ['стілець', 'стільці', 'стульці', 'chair', 'крісло', 'сидіння']
  },
  {
    slug: 'sofas',
    name: 'Дивани',
    keywords: ['диван', 'дивани', 'диванів', 'sofa', 'софа']
  },
  {
    slug: 'cornerSofas',
    name: 'Кутові дивани',
    keywords: ['кутовий', 'кутовий диван', 'кутові', 'corner sofa', 'кутовий']
  },
  {
    slug: 'sofaBeds',
    name: 'Дивани-ліжка',
    keywords: ['диван ліжко', 'диван-ліжко', 'розкладний', 'sofa bed', 'розкладний диван']
  },
  {
    slug: 'beds',
    name: 'Ліжка',
    keywords: ['ліжко', 'ліжка', 'bed', 'спальне', 'односпальне', 'двоспальне']
  },
  {
    slug: 'mattresses',
    name: 'Матраци',
    keywords: ['матрац', 'матраци', 'матрас', 'mattress', 'ортопедичний']
  },
  {
    slug: 'wardrobes',
    name: 'Шафи',
    keywords: ['шафа', 'шафи', 'wardrobe', 'гардероб', 'купе']
  }
];

// Filter keyword mappings
export const FILTER_KEYWORDS: FilterSuggestion[] = [
  // Status filters
  {
    type: 'status',
    value: 'new',
    label: 'Новинки',
    keywords: ['новинка', 'новий', 'нові', 'new', 'новинки']
  },
  {
    type: 'status',
    value: 'on_sale',
    label: 'Акційні товари',
    keywords: ['акція', 'акційні', 'знижка', 'sale', 'розпродаж', 'discount']
  },
  {
    type: 'status',
    value: 'bestseller',
    label: 'Популярні товари',
    keywords: ['популярний', 'популярні', 'bestseller', 'хіт', 'топ']
  },

  // Type filters
  {
    type: 'type',
    value: 'folding',
    label: 'Складні',
    keywords: ['складний', 'складані', 'складной', 'folding', 'розкладний']
  },
  {
    type: 'type',
    value: 'kitchen',
    label: 'Кухонні',
    keywords: ['кухонний', 'кухонні', 'kitchen', 'кухня', 'обідній']
  },
  {
    type: 'type',
    value: 'office',
    label: 'Офісні',
    keywords: ['офісний', 'офісні', 'office', 'робочий', 'для офісу']
  },
  {
    type: 'type',
    value: 'modular',
    label: 'Модульні',
    keywords: ['модульний', 'модульні', 'modular', 'секційний']
  },

  // Material filters
  {
    type: 'material',
    value: 'wood',
    label: 'Дерево',
    keywords: ['дерев\'яний', 'дерево', 'wood', 'wooden', 'деревяний']
  },
  {
    type: 'material',
    value: 'metal',
    label: 'Метал',
    keywords: ['металевий', 'метал', 'metal', 'металічний']
  },
  {
    type: 'material',
    value: 'fabric',
    label: 'Тканина',
    keywords: ['тканина', 'тканинний', 'fabric', 'текстиль', 'м\'яка']
  },
  {
    type: 'material',
    value: 'leather',
    label: 'Шкіра',
    keywords: ['шкіра', 'шкіряний', 'leather', 'екошкіра', 'шкірозамінник']
  },

  // Feature filters
  {
    type: 'feature',
    value: 'shelves',
    label: 'З полицями',
    keywords: ['полиці', 'полка', 'shelves', 'з полицями', 'shelf']
  },
  {
    type: 'feature',
    value: 'high_legs',
    label: 'Високі ніжки',
    keywords: ['високі ніжки', 'high legs', 'високі']
  },
  {
    type: 'feature',
    value: 'low_legs',
    label: 'Низькі ніжки',
    keywords: ['низькі ніжки', 'low legs', 'низькі']
  },
  {
    type: 'feature',
    value: 'lift',
    label: 'З підйомним механізмом',
    keywords: ['підйомний', 'механізм', 'lift', 'з підйомником', 'підйом']
  }
];

/**
 * Find category suggestions based on search query
 */
export function findCategorySuggestions(query: string): CategorySuggestion[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase().trim();

  return CATEGORY_KEYWORDS.filter(category =>
    category.keywords.some(keyword =>
      keyword.includes(lowerQuery) || lowerQuery.includes(keyword)
    )
  );
}

/**
 * Find filter suggestions based on search query
 */
export function findFilterSuggestions(query: string): FilterSuggestion[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase().trim();

  return FILTER_KEYWORDS.filter(filter =>
    filter.keywords.some(keyword =>
      keyword.includes(lowerQuery) || lowerQuery.includes(keyword)
    )
  );
}

/**
 * Check if query contains category-specific keywords
 */
export function extractCategoryFromQuery(query: string): string | null {
  const suggestions = findCategorySuggestions(query);
  return suggestions.length > 0 ? suggestions[0].slug : null;
}

/**
 * Extract filter keywords from query
 */
export function extractFiltersFromQuery(query: string): FilterSuggestion[] {
  return findFilterSuggestions(query);
}
