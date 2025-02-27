// app/lib/definitions.ts

export interface Product {
  id: number;               // Unique identifier for the product
  name: string;             // Name of the product
  slug: string;             // URL-friendly slug of the product
  description: string;      // Detailed description of the product
  category: string;         // Category (e.g., sofa, table, chair)
  price: number;            // Price of the product (corrected from 'Price')
  stock: number;            // Quantity available in stock
  rating: number;           // Average rating of the product
  is_on_sale: boolean;      // Indicates if the product is on sale
  is_new: boolean;          // Indicates if the product is a new arrival
  is_bestseller: boolean;   // Indicates if the product is a bestseller
  created_at: string;       // Timestamp when the product was created
  updated_at: string;       // Timestamp when the product was last updated
}

export interface ProductImage {
  id: number;               // Unique identifier for the image
  product_id: number;       // Identifier linking the image to the product
  image_url: string;        // URL of the image
  alt: string;              // Alt text for the image
  created_at: string;       // Timestamp when the image was created
  updated_at: string;       // Timestamp when the image was last updated
}

export interface ProductSpecs {
  id: number;
  product_id: number;
  construction: string;
  dimensions: {
    length: number;
    depth: number;
    height: number;
    sleeping_area: { width: number; length: number };
  };
  material: {
    type: string;
    composition: string | null;
    backrest_filling: string;
    covers: string;
  };
  inner_material: {
    structure: string;
    cushion_filling: string;
  };
  additional_features: string | null;
  has_shelves: boolean;
  leg_height: string | null;
  has_lift_mechanism: boolean;
  types: string[];
}

export interface ProductColor {
  color: string;
  product_id: number;
  image_url: string;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
  specs: ProductSpecs;
  colors: ProductColor[];
}

export interface Review {
  id: number;               // Unique identifier for the review
  product_id: number;       // Identifier linking the review to the product
  user_name: string;        // Name of the reviewer
  rating: number;           // Rating given by the reviewer (1-5)
  comment: string;          // Review comment
  created_at: string;       // Timestamp when the review was created
}

export interface CartItem {
  id: string;               // Unique cart item ID
  product_id: number;
  slug?: string;
  name: string;
  price: number;            // Corrected from 'Price'
  quantity: number;
  color?: string;           // Selected color of the product
  colors?: ProductColor[];  // Images of the product colors
  image_url?: string;       // Images of the product
  productDetails?: ProductWithImages;
}

export interface ProductWithDetails extends CartItem {
  product_id: number;
  product_name: string;
  slug: string;
  description: string;
  category: string;
  product_price: number;    // Corrected from 'product_Price'
  stock: number;
  rating: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  product_created_at: Date;
  product_updated_at: Date;
  specs: any;
  images: any[];
  colors: any[];
}

export interface Cart {
  id: string;               // Cart ID (from the cookie)
  items: CartItem[];
  total_items: number;
  total_price: number;      // Corrected from 'total_Price'
}

export interface FilterOption {
  id: string;
  name: string;
  value: string;
}

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

export interface CategoryFilters {
  [category: string]: FilterGroup[];
}

export const FURNITURE_FILTERS: CategoryFilters = {
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
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 100000,
        step: 1000
      }
    },
    {
      name: 'Material of the facade',
      type: 'checkbox',
      options: [
        { id: 'dsp', name: 'ДСП', value: 'dsp' },
        { id: 'mdf', name: 'МДФ', value: 'mdf' },
        { id: 'mirror', name: 'Дзеркало', value: 'mirror' },
        { id: 'photo', name: 'Фотодрук', value: 'photo' },
        { id: 'combined', name: 'Комбіновані', value: 'combined' },
      ]
    }
  ],
  tables: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'coffee', name: 'Журнальні столики', value: 'coffee' },
        { id: 'dining', name: 'Обідні столи', value: 'dining' },
        { id: 'computer', name: 'Комп\'ютерні столи', value: 'computer' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 50000,
        step: 500
      }
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
      ]
    },
    {
      name: 'Features',
      type: 'radio',
      options: [
        { id: 'folding', name: 'Розкладний', value: 'folding' },
        { id: 'non_folding', name: 'Нерозкладний', value: 'non_folding' },
      ]
    },
    {
      name: 'Form of the table top',
      type: 'checkbox',
      options: [
        { id: 'round', name: 'Круглий', value: 'round' },
        { id: 'oval', name: 'Овальний', value: 'oval' },
        { id: 'square', name: 'Квадратний', value: 'square' },
        { id: 'rectangular', name: 'Прямокутний', value: 'rectangular' },
      ]
    }
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
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 20000,
        step: 250
      }
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'wood', name: 'Дерево', value: 'wood' },
        { id: 'plastic', name: 'Пластик', value: 'plastic' },
        { id: 'aluminum', name: 'Алюміній', value: 'aluminum' },
      ]
    }
  ],
  sofaBeds: [
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 100000,
        step: 1000
      }
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'На високих ніжках', value: 'high_legs' },
        { id: 'low_legs', name: 'На низьких ніжках', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ]
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Натуральна шкіра', value: 'leather' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
      ]
    }
  ],
  cornerSofas: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'folding', name: 'Розкладні дивани', value: 'folding' },
        { id: 'kitchen', name: 'Дивани для кухні', value: 'kitchen' },
        { id: 'office', name: 'Офісні дивани', value: 'office' },
        { id: 'modular', name: 'Модульні дивани', value: 'modular' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 100000,
        step: 1000
      }
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'На високих ніжках', value: 'high_legs' },
        { id: 'low_legs', name: 'На низьких ніжках', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ]
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Натуральна шкіра', value: 'leather' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
      ]
    }
  ],
  sofas: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'folding', name: 'Розкладні дивани', value: 'folding' },
        { id: 'kitchen', name: 'Дивани для кухні', value: 'kitchen' },
        { id: 'office', name: 'Офісні дивани', value: 'office' },
        { id: 'modular', name: 'Модульні дивани', value: 'modular' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 100000,
        step: 1000
      }
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'shelves', name: 'З поличками', value: 'shelves' },
        { id: 'high_legs', name: 'На високих ніжках', value: 'high_legs' },
        { id: 'low_legs', name: 'На низьких ніжках', value: 'low_legs' },
        { id: 'lift', name: 'З підйомним механізмом', value: 'lift' },
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
      ]
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Натуральна шкіра', value: 'leather' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
      ]
    }
  ],
  beds: [
    {
      name: 'Type',
      type: 'radio',
      options: [
        { id: 'children', name: 'Дитячі', value: 'children' },
        { id: 'adult', name: 'Ліжка для дорослих', value: 'adult' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 80000,
        step: 1000
      }
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'leather', name: 'Шкіра', value: 'leather' },
        { id: 'eco_leather', name: 'Еко-шкіра', value: 'eco_leather' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
      ]
    },
    {
      name: 'Complectation',
      type: 'checkbox',
      options: [
        { id: 'no_lift', name: 'Без підйомного механізму', value: 'no_lift' },
        { id: 'parallel_lift', name: 'З механізмом паралельного підйому', value: 'parallel_lift' },
        { id: 'vertical_lift', name: 'З механізмом вертикального підйому', value: 'vertical_lift' },
        { id: 'sides', name: 'З бортиками', value: 'sides' },
        { id: 'soft_headboard', name: 'З м\'яким узголів\'ям', value: 'soft_headboard' },
      ]
    },
    {
      name: 'Dimensions',
      type: 'radio',
      options: [
        { id: 'double', name: 'Двоспальні ліжка', value: 'double' },
        { id: 'single', name: 'Односпальні ліжка', value: 'single' },
      ]
    },
    {
      name: 'Beackrest',
      type: 'radio',
      options: [
        { id: 'high', name: 'Висока', value: 'high' },
        { id: 'low', name: 'Низька', value: 'low' },
      ]
    }
  ],
  mattresses: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'no_springs', name: 'Безпружинні матраци', value: 'no_springs' },
        { id: 'coconut', name: 'Матраци з кокосовою койрою', value: 'coconut' },
        { id: 'spring', name: 'Матраци на пружинному блоці', value: 'spring' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 30000,
        step: 500
      }
    },
    {
      name: 'Hardness',
      type: 'radio',
      options: [
        { id: 'hard', name: 'Жорсткий матрац', value: 'hard' },
        { id: 'medium', name: 'Помірна Hardness', value: 'medium' },
        { id: 'soft', name: 'М\'який матрац', value: 'soft' },
      ]
    },
    {
      name: 'Dimensions',
      type: 'radio',
      options: [
        { id: 'single', name: 'Односпальний', value: 'single' },
        { id: 'double', name: 'Двоспальний', value: 'double' },
      ]
    }
  ],
  accessories: [
    {
      name: 'Type',
      type: 'checkbox',
      options: [
        { id: 'wall_shelves', name: 'Настінні полиці', value: 'wall_shelves' },
        { id: 'book_shelves', name: 'Книжкові полиці', value: 'book_shelves' },
        { id: 'cabinets', name: 'Тумби', value: 'cabinets' },
        { id: 'makeup_table', name: 'Столик для макіяжу', value: 'makeup_table' },
        { id: 'chest_drawers', name: 'Комоди', value: 'chest_drawers' },
        { id: 'wall_cabinets', name: 'Підвісні шафки', value: 'wall_cabinets' },
        { id: 'poufs', name: 'Пуфи', value: 'poufs' },
      ]
    },
    {
      name: 'Price',
      type: 'range',
      range: {
        min: 0,
        max: 15000,
        step: 250
      }
    },
    {
      name: 'Material',
      type: 'checkbox',
      options: [
        { id: 'wood', name: 'Натуральне дерево', value: 'wood' },
        { id: 'textile', name: 'Текстиль', value: 'textile' },
        { id: 'mdf', name: 'МДФ', value: 'mdf' },
        { id: 'dsp', name: 'ДСП', value: 'dsp' },
        { id: 'glass', name: 'Скло', value: 'glass' },
        { id: 'combined', name: 'Комбіновані', value: 'combined' },
      ]
    }
  ]
};