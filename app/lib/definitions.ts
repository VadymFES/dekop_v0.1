// app/lib/definitions.ts

// Base Product interface with common fields for all products
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string; 
  price: number;
  stock: number;
  rating: number;
  reviews: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  created_at: string;
  updated_at: string;
}

// Interface for product images
export interface ProductImage {
  id: number;
  image_url: string;
  url: string;
  alt: string;
  is_primary: boolean;
}

// Base interface for common specification fields across categories
export interface BaseSpecs {
  id: number;
  product_id: number;
  category: string;
  dimensions?: {
    length?: number;
    width?: number;
    depth?: number;
    height?: number;
    sleeping_area?: { width: number; length: number };
  };
  types?: string[]; // Додано для всіх типів, оскільки це є в усіх таблицях
}

// Category-specific specification interfaces

// Specifications for corner sofas
export interface CornerSofaSpecs extends BaseSpecs {
  category: 'corner_sofas';
  construction: string;
  dimensions: {
    length: number;
    width: number;
    depth: number;
    height: number;
    sleeping_area?: { width: number; length: number };
  };
  material: {
    type: string;
    composition?: string | null;
    backrest_filling?: string;
    covers?: string | null;
  };
  inner_material?: {
    structure: string;
    cushion_filling: string;
  };
  additional_features?: string;
  has_shelves?: boolean;
  leg_height?: string;
  has_lift_mechanism?: boolean;
  types?: string[];
  armrest_type?: string | null;
  seat_height?: number | null;
}

// Specifications for sofas
export interface SofaSpecs extends BaseSpecs {
  category: 'sofas';
  construction: string;
  dimensions: {
    length: number;
    depth: number;
    height: number;
    sleeping_area?: { width: number; length: number };
  };
  material: {
    type: string;
    composition?: string | null;
    backrest_filling?: string;
    covers?: string | null;
  };
  inner_material?: {
    structure: string;
    cushion_filling: string;
  };
  additional_features?: string;
  has_shelves?: boolean;
  leg_height?: string;
  has_lift_mechanism?: boolean;
  types?: string[];
  armrest_type?: string | null;
  seat_height?: number | null;
}

// Specifications for sofa beds
export interface SofaBedSpecs extends BaseSpecs {
  category: 'sofa_beds';
  construction: string;
  dimensions: {
    length: number;
    depth: number;
    height: number;
    sleeping_area?: { width: number; length: number };
  };
  material: {
    type: string;
    composition?: string | null;
    backrest_filling?: string;
    covers?: string | null;
  };
  inner_material?: {
    structure: string;
    cushion_filling: string;
  };
  additional_features?: string;
  has_shelves?: boolean;
  leg_height?: string;
  has_lift_mechanism?: boolean;
  types?: string[];
  armrest_type?: string | null;
  seat_height?: number | null;
}

// Specifications for beds
export interface BedSpecs extends BaseSpecs {
  category: 'beds';
  construction?: string;
  dimensions: {
    length: number;
    depth: number;
    height: number;
    sleeping_area?: { width: number; length: number };
  };
  headboard_type?: string | null;
  storage_options?: string | null;
  material: string;
  types?: string[];
}

// Specifications for tables
export interface TableSpecs extends BaseSpecs {
  category: 'tables';
  shape?: string;
  extendable?: boolean;
  material: string;
  dimensions: {
    length: number;
    width: number;
    depth: number;
    height: number;
  };
  types?: string[];
}

// Specifications for chairs
export interface ChairSpecs extends BaseSpecs {
  category: 'chairs';
  upholstery?: string;
  seat_height?: number;
  weight_capacity?: number;
  material: string;
  dimensions: {
    length: number;
    width: number;
    depth: number;
    height: number;
  };
  types?: string[];
}

// Specifications for mattresses
export interface MattressSpecs extends BaseSpecs {
  category: 'mattresses';
  type: string;
  firmness: string;
  thickness: number;
  core_type?: string;
  hardness?: string;
  dimensions: {
    length: number;
    width: number;
  };
  types?: string[];
}

// Specifications for wardrobes
export interface WardrobeSpecs extends BaseSpecs {
  category: 'wardrobes';
  door_count: number;
  door_type: string;
  internal_layout?: string;
  material: string;
  dimensions: {
    length: number;
    width: number;
    depth: number;
    height: number;
  };
  types?: string[];
}

// Specifications for accessories
export interface AccessorySpecs extends BaseSpecs {
  category: 'accessories';
  mounting_type?: string | null;
  shelf_count?: number | null;
  material: string;
  dimensions: {
    length: number;
    width: number;
    depth: number;
    height: number;
  };
  types?: string[];
}

// Discriminated union for ProductSpecs to handle different categories
export type ProductSpecs =
  | SofaSpecs
  | CornerSofaSpecs
  | SofaBedSpecs
  | BedSpecs
  | TableSpecs
  | ChairSpecs
  | MattressSpecs
  | WardrobeSpecs
  | AccessorySpecs;

// Interface for product colors
export interface ProductColor {
  product_id: number;
  color: string;
  image_url: string;
}

// Extended Product interface including images, specs, and colors
export interface ProductWithImages extends Product {
  images: ProductImage[];
  specs: ProductSpecs | null; // Додано null, оскільки може бути null
  colors: ProductColor[];
}

// Interface for product reviews
export interface Review {
  id: number;
  product_id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Interface for cart items
export interface CartItem {
  id: string;
  product_id: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  colors?: ProductColor[];
  image_url?: string;
  productDetails?: ProductWithImages;
}

// Interface for the shopping cart
export interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  total_price: number;
}

// Interface for filter options
export interface FilterOption {
  id: string;
  name: string;
  value: string;
}

// Interface for filter groups
export interface FilterGroup {
  name: string;
  type: 'checkbox' | 'radio' | 'range' | 'color';
  options?: FilterOption[];
  range?: {
    min: number;
    max: number;
    step: number;
  };
}

// Defines the structure for a price range
export interface PriceRange {
  min: number;
  max: number;
}

// Defines the structure for the filters state
export interface FiltersState {
  type?: string[] | null;
  material?: string[] | null;
  complectation?: string[] | null;
  facadeMaterial?: string[] | null; 
  specifics?: string | null;        
  tabletopShape?: string[] | null;  
  size?: string | null;
  backrest?: string | null;         
  hardness?: string | null;      
  status?: string[] | null;
  priceMin: number;
  priceMax: number;
}

// Interface for filter options used in catalog components
export interface FilterOptions {
  type?: string[];
  material?: string[];
  status?: string[];
  complectation?: string[];
  priceMin?: number;
  priceMax?: number;
}

// Performance monitoring types
export interface PerformanceLogEntry {
  timestamp: number;
  changes: Record<string, { from: unknown; to: unknown }>;
}

export interface LogContext {
  component?: string;
  action?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

// Generic callback type for utilities
export type GenericCallback<T extends unknown[] = unknown[], R = unknown> = (...args: T) => R;

// Interface for category-specific filters
export interface CategoryFilters {
  [category: string]: FilterGroup[];
}

// Example filter configurations for furniture categories
export const FURNITURE_FILTERS: CategoryFilters = {
  sofas: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'straight', name: 'Прямі', value: 'straight' },
        { id: 'folding', name: 'Розкладні', value: 'folding' },
        { id: 'modular', name: 'Модульні', value: 'modular' },
        { id: 'kitchen', name: 'Кухонні', value: 'kitchen' },
        { id: 'office', name: 'Офісні', value: 'office' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 100000, step: 1000 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Шкіра', value: 'leather' },
        { id: 'fabric', name: 'Тканина', value: 'fabric' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'velour', name: 'Велюр', value: 'velour' },
      ],
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'Високі ніжки', value: 'high_legs' },
        { id: 'low_legs', name: 'Низькі ніжки', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ],
    },
    {
      name: 'Size',
      type: 'radio',
      options: [
        { id: 'single', name: 'Одномісний', value: 'single' },
        { id: 'double', name: 'Двомісний і більше', value: 'double' },
      ],
    },
  ],
  sofaBeds: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'straight', name: 'Прямі', value: 'straight' },
        { id: 'folding', name: 'Розкладні', value: 'folding' },
        { id: 'modular', name: 'Модульні', value: 'modular' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 100000, step: 1000 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Шкіра', value: 'leather' },
        { id: 'fabric', name: 'Тканина', value: 'fabric' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'velour', name: 'Велюр', value: 'velour' },
      ],
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'Високі ніжки', value: 'high_legs' },
        { id: 'low_legs', name: 'Низькі ніжки', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ],
    },
    {
      name: 'Size',
      type: 'radio',
      options: [
        { id: 'single', name: 'Одномісний', value: 'single' },
        { id: 'double', name: 'Двомісний і більше', value: 'double' },
      ],
    },
  ],
  cornerSofas: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'folding', name: 'Розкладні', value: 'folding' },
        { id: 'modular', name: 'Модульні', value: 'modular' },
        { id: 'kitchen', name: 'Кухонні', value: 'kitchen' },
        { id: 'office', name: 'Офісні', value: 'office' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 150000, step: 1000 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Шкіра', value: 'leather' },
        { id: 'fabric', name: 'Тканина', value: 'fabric' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'velour', name: 'Велюр', value: 'velour' },
      ],
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'Високі ніжки', value: 'high_legs' },
        { id: 'low_legs', name: 'Низькі ніжки', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ],
    },
  ],
  wardrobes: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'sliding_doors', name: 'Шафи-купе', value: 'sliding_doors' },
        { id: 'walk_in', name: 'Гардеробні', value: 'walk_in' },
        { id: 'one_door', name: 'Однодверні модульні', value: 'one_door' },
        { id: 'two_doors', name: 'Дводверні модульні', value: 'two_doors' },
        { id: 'three_doors', name: 'Тридверні модульні', value: 'three_doors' },
        { id: 'four_doors', name: 'Чотиридверні модульні', value: 'four_doors' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 100000, step: 1000 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'dsp', name: 'ДСП', value: 'dsp' },
        { id: 'mdf', name: 'МДФ', value: 'mdf' },
        { id: 'mirror', name: 'Дзеркало', value: 'mirror' },
        { id: 'photo', name: 'Фотодрук', value: 'photo' },
        { id: 'combined', name: 'Комбіновані', value: 'combined' },
      ],
    },
  ],
  tables: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'coffee', name: 'Журнальні столики', value: 'coffee' },
        { id: 'dining', name: 'Обідні столи', value: 'dining' },
        { id: 'computer', name: 'Комп\'ютерні столи', value: 'computer' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 50000, step: 500 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'wood', name: 'Натуральне дерево', value: 'wood' },
        { id: 'mdf', name: 'МДФ', value: 'mdf' },
        { id: 'glass', name: 'Скло', value: 'glass' },
        { id: 'ceramic', name: 'Склокераміка', value: 'ceramic' },
        { id: 'aluminum', name: 'Алюміній', value: 'aluminum' },
      ],
    },
    {
      name: 'Features',
      type: 'radio',
      options: [
        { id: 'folding', name: 'Розкладний', value: 'folding' },
        { id: 'non_folding', name: 'Нерозкладний', value: 'non_folding' },
      ],
    },
    {
      name: 'Form of the table top',
      type: 'checkbox',
      options: [
        { id: 'round', name: 'Круглий', value: 'round' },
        { id: 'oval', name: 'Овальний', value: 'oval' },
        { id: 'square', name: 'Квадратний', value: 'square' },
        { id: 'rectangular', name: 'Прямокутний', value: 'rectangular' },
      ],
    },
  ],
  chairs: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'kitchen', name: 'Кухонні', value: 'kitchen' },
        { id: 'bar', name: 'Барні', value: 'bar' },
        { id: 'computer', name: 'Комп\'ютерні', value: 'computer' },
        { id: 'office', name: 'Офісні', value: 'office' },
        { id: 'children', name: 'Дитячі', value: 'children' },
        { id: 'loft', name: 'Стільці Лофт', value: 'loft' },
        { id: 'stool', name: 'Табуретки', value: 'stool' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 20000, step: 250 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'wood', name: 'Дерево', value: 'wood' },
        { id: 'plastic', name: 'Пластик', value: 'plastic' },
        { id: 'aluminum', name: 'Алюміній', value: 'aluminum' },
      ],
    },
  ],
  beds: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'single', name: 'Односпальні', value: 'single' },
        { id: 'double', name: 'Двоспальні', value: 'double' },
        { id: 'bunk', name: 'Двоярусні', value: 'bunk' },
        { id: 'transformer', name: 'Трансформери', value: 'transformer' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 80000, step: 1000 },
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'wood', name: 'Натуральне дерево', value: 'wood' },
        { id: 'mdf', name: 'МДФ', value: 'mdf' },
        { id: 'fabric', name: 'М\'яка оббивка', value: 'fabric' },
        { id: 'leather', name: 'Шкіра', value: 'leather' },
      ],
    },
  ],
  mattresses: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'spring', name: 'Пружинні', value: 'spring' },
        { id: 'foam', name: 'Пінні', value: 'foam' },
        { id: 'latex', name: 'Латексні', value: 'latex' },
        { id: 'orthopedic', name: 'Ортопедичні', value: 'orthopedic' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 50000, step: 500 },
    },
    {
      name: 'Hardness',
      type: 'radio',
      options: [
        { id: 'soft', name: 'М\'який', value: 'soft' },
        { id: 'medium', name: 'Середній', value: 'medium' },
        { id: 'firm', name: 'Жорсткий', value: 'firm' },
        { id: 'different', name: 'Різносторонній', value: 'different' },
      ],
    },
  ],
  accessories: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'mirror', name: 'Дзеркала', value: 'mirror' },
        { id: 'shelf', name: 'Полиці', value: 'shelf' },
        { id: 'lamp', name: 'Світильники', value: 'lamp' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
        { id: 'pillow', name: 'Подушки', value: 'pillow' },
      ],
    },
    {
      name: 'Price',
      type: 'range',
      range: { min: 0, max: 10000, step: 100 },
    },
  ],
};