// api/products/[slug]/route.ts

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { 
  ProductWithImages, 
  ProductImage, 
  ProductColor, 
  ProductSpecs,
  SofaSpecs,
  CornerSofaSpecs,
  SofaBedSpecs,
  BedSpecs,
  TableSpecs,
  ChairSpecs,
  MattressSpecs,
  WardrobeSpecs,
  AccessorySpecs,
  Review
} from "@/app/lib/definitions";

// Вбудована функція нормалізації категорій
function normalizeCategory(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'Диван': 'sofas',
    'диван': 'sofas',
    'Кутовий Диван': 'corner_sofas',
    'кутовий диван': 'corner_sofas',
    'Диван-Ліжко': 'sofa_beds',
    'диван-ліжко': 'sofa_beds',
    'Стілець': 'chairs',
    'стілець': 'chairs',
    'Стіл': 'tables',
    'стіл': 'tables',
    'Шафа': 'wardrobes',
    'шафа': 'wardrobes',
    'Гардероб': 'wardrobes',
    'гардероб': 'wardrobes',
    'Ліжко': 'beds',
    'ліжко': 'beds',
    'Матрац': 'mattresses',
    'матрац': 'mattresses',
    'Аксесуар': 'accessories',
    'аксесуар': 'accessories'
  };

  return categoryMap[category] || category.toLowerCase();
}

// Interface for the raw database row data
interface ProductSpecRow {
  id?: number;
  product_id?: number;
  construction?: string;
  dimensions_length?: number | string;
  dimensions_width?: number | string;
  dimensions_depth?: number | string;
  dimensions_height?: number | string;
  dimensions_sleeping_area_width?: number | string;
  dimensions_sleeping_area_length?: number | string;
  material?: string;
  material_type?: string;
  material_composition?: string;
  material_backrest_filling?: string;
  material_covers?: string;
  inner_material_structure?: string;
  inner_material_cushion_filling?: string;
  additional_features?: string;
  has_shelves?: boolean | number | string;
  leg_height?: string;
  has_lift_mechanism?: boolean | number | string;
  types?: string[];
  armrest_type?: string;
  seat_height?: number | string;
  headboard_type?: string;
  storage_options?: string;
  shape?: string;
  extendable?: boolean | number | string;
  upholstery?: string;
  weight_capacity?: number | string;
  type?: string;
  core_type?: string;
  hardness?: string;
  door_count?: number | string;
  door_type?: string;
  internal_layout?: string;
  mounting_type?: string;
  shelf_count?: number | string;
  // Add any other fields that might appear in your database rows
  [key: string]: any;
}

// Функція для маппінгу специфікацій залежно від категорії
function mapProductSpecs(normalizedCategory: string, row: ProductSpecRow): ProductSpecs | null {
  if (!row) return null;
  
  // Базова функція для безпечного отримання числових значень
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Базова функція для безпечного отримання булевих значень
  const safeBoolean = (value: any): boolean | undefined => {
    if (value === null || value === undefined) return undefined;
    return value === true || value === 'true' || value === 1;
  };

  switch (normalizedCategory) {
    case 'corner_sofas': {
      const specs: CornerSofaSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'corner_sofas',
        construction: row.construction || '',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height),
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: safeNumber(row.dimensions_sleeping_area_width),
              length: safeNumber(row.dimensions_sleeping_area_length)
            }
          } : {})
        },
        material: {
          type: row.material_type || '',
          composition: row.material_composition || null,
          backrest_filling: row.material_backrest_filling || undefined,
          covers: row.material_covers || null
        },
        inner_material: row.inner_material_structure || row.inner_material_cushion_filling ? {
          structure: row.inner_material_structure || '',
          cushion_filling: row.inner_material_cushion_filling || ''
        } : undefined,
        additional_features: row.additional_features || undefined,
        has_shelves: safeBoolean(row.has_shelves),
        leg_height: row.leg_height || undefined,
        has_lift_mechanism: safeBoolean(row.has_lift_mechanism),
        types: Array.isArray(row.types) ? row.types : [],
        armrest_type: row.armrest_type || undefined,
        seat_height: row.seat_height ? safeNumber(row.seat_height) : undefined
      };
      return specs;
    }
    
    case 'sofas': {
      const specs: SofaSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'sofas',
        construction: row.construction || '',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height),
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: safeNumber(row.dimensions_sleeping_area_width),
              length: safeNumber(row.dimensions_sleeping_area_length)
            }
          } : {})
        },
        material: {
          type: row.material_type || '',
          composition: row.material_composition || null,
          backrest_filling: row.material_backrest_filling || undefined,
          covers: row.material_covers || null
        },
        inner_material: row.inner_material_structure || row.inner_material_cushion_filling ? {
          structure: row.inner_material_structure || '',
          cushion_filling: row.inner_material_cushion_filling || ''
        } : undefined,
        additional_features: row.additional_features || undefined,
        has_shelves: safeBoolean(row.has_shelves),
        leg_height: row.leg_height || undefined,
        has_lift_mechanism: safeBoolean(row.has_lift_mechanism),
        types: Array.isArray(row.types) ? row.types : [],
        armrest_type: row.armrest_type || undefined,
        seat_height: row.seat_height ? safeNumber(row.seat_height) : undefined
      };
      return specs;
    }
    
    case 'sofa_beds': {
      const specs: SofaBedSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'sofa_beds',
        construction: row.construction || '',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height),
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: safeNumber(row.dimensions_sleeping_area_width),
              length: safeNumber(row.dimensions_sleeping_area_length)
            }
          } : {})
        },
        material: {
          type: row.material_type || '',
          composition: row.material_composition || null,
          backrest_filling: row.material_backrest_filling || undefined,
          covers: row.material_covers || null
        },
        inner_material: row.inner_material_structure || row.inner_material_cushion_filling ? {
          structure: row.inner_material_structure || '',
          cushion_filling: row.inner_material_cushion_filling || ''
        } : undefined,
        additional_features: row.additional_features || undefined,
        has_shelves: safeBoolean(row.has_shelves),
        leg_height: row.leg_height || undefined,
        has_lift_mechanism: safeBoolean(row.has_lift_mechanism),
        types: Array.isArray(row.types) ? row.types : [],
        armrest_type: row.armrest_type || undefined,
        seat_height: row.seat_height ? safeNumber(row.seat_height) : undefined
      };
      return specs;
    }

    case 'beds': {
      const specs: BedSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'beds',
        construction: row.construction || undefined,
        dimensions: {
          length: safeNumber(row.dimensions_length),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height),
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: safeNumber(row.dimensions_sleeping_area_width),
              length: safeNumber(row.dimensions_sleeping_area_length)
            }
          } : {})
        },
        headboard_type: row.headboard_type || null,
        storage_options: row.storage_options || null,
        material: row.material || '',
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    case 'tables': {
      const specs: TableSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'tables',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height)
        },
        shape: row.shape || undefined,
        extendable: safeBoolean(row.extendable),
        material: row.material || '',
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    case 'chairs': {
      const specs: ChairSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'chairs',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height)
        },
        upholstery: row.upholstery || undefined,
        seat_height: row.seat_height ? safeNumber(row.seat_height) : undefined,
        weight_capacity: row.weight_capacity ? safeNumber(row.weight_capacity) : undefined,
        material: row.material || '',
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    case 'mattresses': {
      const specs: MattressSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'mattresses',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width || row.dimensions_depth)
        },
        type: row.type || row.core_type || row.material || '',
        firmness: row.hardness || '',
        thickness: safeNumber(row.dimensions_height),
        core_type: row.core_type || undefined,
        hardness: row.hardness || undefined,
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    case 'wardrobes': {
      const specs: WardrobeSpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'wardrobes',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height)
        },
        door_count: safeNumber(row.door_count),
        door_type: row.door_type || '',
        internal_layout: row.internal_layout || undefined,
        material: row.material || '',
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    case 'accessories': {
      const specs: AccessorySpecs = {
        id: safeNumber(row.id),
        product_id: safeNumber(row.product_id),
        category: 'accessories',
        dimensions: {
          length: safeNumber(row.dimensions_length),
          width: safeNumber(row.dimensions_width),
          depth: safeNumber(row.dimensions_depth),
          height: safeNumber(row.dimensions_height)
        },
        mounting_type: row.mounting_type || null,
        shelf_count: row.shelf_count ? safeNumber(row.shelf_count) : null,
        material: row.material || '',
        types: Array.isArray(row.types) ? row.types : []
      };
      return specs;
    }

    default:
      // Для невідомих категорій повертаємо null
      console.log(`Unknown category: ${normalizedCategory}, cannot create specs`);
      return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;

  try {
    // Query to get the product by slug.
    const { rows: productRows } = await sql`
      SELECT * FROM products WHERE slug = ${slug}
    `;

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRows[0];
    const normalizedCategory = normalizeCategory(product.category);

    // Отримання рейтингу та кількості відгуків з таблиці reviews
    const { rows: reviewStats } = await sql`
      SELECT 
        COUNT(*) AS reviews_count, 
        COALESCE(AVG(rating), 0) AS average_rating
      FROM reviews 
      WHERE product_id = ${product.id}
    `;

    const reviewCount = parseInt(reviewStats[0]?.reviews_count || '0');
    const averageRating = parseFloat(reviewStats[0]?.average_rating || '0');

    // Отримання всіх відгуків для цього товару
    const { rows: reviewRows } = await sql`
      SELECT id, product_id, user_name, rating, comment, created_at
      FROM reviews
      WHERE product_id = ${product.id}
      ORDER BY created_at DESC
    `;

    // Перетворення результатів запиту в масив типу Review[]
    const reviews: Review[] = reviewRows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      user_name: row.user_name || '',
      rating: row.rating,
      comment: row.comment || '',
      created_at: row.created_at || new Date().toISOString()
    }));

    // Query to get product images with явним приведенням типів
    const { rows: rawImageRows } = await sql`
      SELECT id, image_url, alt, is_primary
      FROM product_images
      WHERE product_id = ${product.id}
    `;

    // Перетворення результатів запиту в масив типу ProductImage[]
    const imageRows: ProductImage[] = rawImageRows.map(row => ({
      id: row.id,
      image_url: row.image_url || '',
      alt: row.alt || '',
      is_primary: Boolean(row.is_primary)
    }));

    // Query to get product colors with явним приведенням типів
    const { rows: rawColorRows } = await sql`
      SELECT product_id, color, image_url
      FROM product_spec_colors
      WHERE product_id = ${product.id}
    `;

    // Перетворення результатів запиту в масив типу ProductColor[]
    const colorRows: ProductColor[] = rawColorRows.map(row => ({
      product_id: row.product_id,
      color: row.color || '',
      image_url: row.image_url || ''
    }));

    // Query to get the product specs based on category
    let specsRows: ProductSpecRow[] = [];
    
    // Визначаємо правильну таблицю специфікацій на основі категорії
    switch (normalizedCategory) {
      case 'corner_sofas':
        specsRows = await sql`
          SELECT * FROM corner_sofa_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'sofas':
        specsRows = await sql`
          SELECT * FROM sofa_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'sofa_beds':
        specsRows = await sql`
          SELECT * FROM sofa_bed_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'chairs':
        specsRows = await sql`
          SELECT * FROM chair_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'tables':
        specsRows = await sql`
          SELECT * FROM table_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'beds':
        specsRows = await sql`
          SELECT * FROM bed_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'mattresses':
        specsRows = await sql`
          SELECT * FROM mattress_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'wardrobes':
        specsRows = await sql`
          SELECT * FROM wardrobe_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      case 'accessories':
        specsRows = await sql`
          SELECT * FROM accessory_specs WHERE product_id = ${product.id}
        `.then(result => result.rows);
        break;
      default:
        // Якщо категорія не відповідає жодній таблиці, залишаємо пустий масив
        console.log(`Unknown category: ${normalizedCategory}`);
        break;
    }

    // Маппінг даних специфікацій з використанням типізованої функції
    const specs = specsRows.length > 0 ? mapProductSpecs(normalizedCategory, specsRows[0]) : null;

    // Перевіряємо, чи є у продукту всі необхідні поля згідно з інтерфейсом Product
    const productData = {
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      category: product.category || '',
      price: typeof product.price === 'number' ? product.price : 
             typeof product.price === 'string' ? parseFloat(product.price) : 0,
      stock: typeof product.stock === 'number' ? product.stock : 0,
      // Використовуємо розрахований рейтинг з таблиці reviews
      rating: averageRating,
      // Додаємо кількість відгуків
      reviews: reviewCount,
      is_on_sale: Boolean(product.is_on_sale),
      is_new: Boolean(product.is_new),
      is_bestseller: Boolean(product.is_bestseller),
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString()
    };

    // Формуємо повний об'єкт згідно з інтерфейсом ProductWithImages
    const productWithDetails: ProductWithImages = {
      ...productData,
      images: imageRows,
      specs,
      colors: colorRows,
    };

    // Додаємо відгуки до відповіді (не входять до ProductWithImages, але корисні для відображення)
    const response = {
      ...productWithDetails,
      reviewsList: reviews
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching product details:", error);
    return NextResponse.json({ error: "Failed to fetch product details" }, { status: 500 });
  }
}