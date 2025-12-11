/**
 * Сторінка редагування товару
 * Завантажує повні дані товару включаючи зображення, кольори та характеристики
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { getAdminUrl } from '@/app/lib/admin-path';
import { db } from '@/app/lib/db';
import ProductForm from '../../components/ProductForm';
import ProductChangelog from '../../components/ProductChangelog';

// Mapping from Ukrainian category names to English enum values
const CATEGORY_MAP: Record<string, string> = {
  // Ukrainian singular forms
  'диван': 'sofas',
  'кутовий диван': 'corner_sofas',
  'диван-ліжко': 'sofa_beds',
  'ліжко': 'beds',
  'стіл': 'tables',
  'стілець': 'chairs',
  'матрац': 'mattresses',
  'шафа': 'wardrobes',
  'аксесуар': 'accessories',
  // Ukrainian plural forms
  'дивани': 'sofas',
  'кутові дивани': 'corner_sofas',
  'дивани-ліжка': 'sofa_beds',
  'ліжка': 'beds',
  'столи': 'tables',
  'стільці': 'chairs',
  'матраци': 'mattresses',
  'шафи': 'wardrobes',
  'аксесуари': 'accessories',
  // English values (pass through)
  'sofas': 'sofas',
  'corner_sofas': 'corner_sofas',
  'sofa_beds': 'sofa_beds',
  'beds': 'beds',
  'tables': 'tables',
  'chairs': 'chairs',
  'mattresses': 'mattresses',
  'wardrobes': 'wardrobes',
  'accessories': 'accessories',
};

// Normalize category to English enum value
function normalizeCategory(category: string): string {
  const normalized = category?.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || category;
}

// Spec table names for each category
const SPEC_TABLES: Record<string, string> = {
  sofas: 'sofa_specs',
  corner_sofas: 'corner_sofa_specs',
  sofa_beds: 'sofa_bed_specs',
  beds: 'bed_specs',
  tables: 'table_specs',
  chairs: 'chair_specs',
  mattresses: 'mattress_specs',
  wardrobes: 'wardrobe_specs',
  accessories: 'accessory_specs',
};

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(getAdminUrl('login'));
  }

  if (!admin.permissions.includes('products.update')) {
    redirect(getAdminUrl('products'));
  }

  const { productId } = await params;
  const id = parseInt(productId, 10);

  if (isNaN(id)) {
    notFound();
  }

  // Get product data
  const productResult = await db.query`
    SELECT * FROM products WHERE id = ${id}
  `;

  if (productResult.rows.length === 0) {
    notFound();
  }

  const product = productResult.rows[0];

  // Normalize category from Ukrainian to English enum value
  const normalizedCategory = normalizeCategory(product.category);

  // Get images
  const imagesResult = await db.query`
    SELECT id, image_url, alt, is_primary
    FROM product_images
    WHERE product_id = ${id}
    ORDER BY is_primary DESC, id ASC
  `;

  // Get colors
  const colorsResult = await db.query`
    SELECT color, image_url
    FROM product_spec_colors
    WHERE product_id = ${id}
  `;

  // Get specs based on normalized category
  const specs = await getProductSpecs(id, normalizedCategory);

  // Build the full product object for the form with normalized category
  const fullProduct = {
    ...product,
    category: normalizedCategory,
    images: imagesResult.rows,
    colors: colorsResult.rows,
    specs: specs || {},
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>
        Редагування товару: {product.name}
      </h1>
      <ProductForm product={fullProduct} />
      <ProductChangelog productId={id} />
    </div>
  );
}

// Helper function to get category-specific specs
async function getProductSpecs(productId: number, category: string) {
  const specTable = SPEC_TABLES[category];
  if (!specTable) return null;

  // Use template literal based on specTable - need to use raw query for dynamic table name
  let result;
  switch (specTable) {
    case 'sofa_specs':
      result = await db.query`SELECT * FROM sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'corner_sofa_specs':
      result = await db.query`SELECT * FROM corner_sofa_specs WHERE product_id = ${productId}`;
      break;
    case 'sofa_bed_specs':
      result = await db.query`SELECT * FROM sofa_bed_specs WHERE product_id = ${productId}`;
      break;
    case 'bed_specs':
      result = await db.query`SELECT * FROM bed_specs WHERE product_id = ${productId}`;
      break;
    case 'table_specs':
      result = await db.query`SELECT * FROM table_specs WHERE product_id = ${productId}`;
      break;
    case 'chair_specs':
      result = await db.query`SELECT * FROM chair_specs WHERE product_id = ${productId}`;
      break;
    case 'mattress_specs':
      result = await db.query`SELECT * FROM mattress_specs WHERE product_id = ${productId}`;
      break;
    case 'wardrobe_specs':
      result = await db.query`SELECT * FROM wardrobe_specs WHERE product_id = ${productId}`;
      break;
    case 'accessory_specs':
      result = await db.query`SELECT * FROM accessory_specs WHERE product_id = ${productId}`;
      break;
    default:
      return null;
  }

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Convert flat database columns to nested object format expected by form
  const specs: Record<string, unknown> = {};

  // Build dimensions object from flat columns
  const dimensions: Record<string, unknown> = {};
  if (row.dimensions_length !== undefined && row.dimensions_length !== null) {
    dimensions.length = Number(row.dimensions_length);
  }
  if (row.dimensions_width !== undefined && row.dimensions_width !== null) {
    dimensions.width = Number(row.dimensions_width);
  }
  if (row.dimensions_depth !== undefined && row.dimensions_depth !== null) {
    dimensions.depth = Number(row.dimensions_depth);
  }
  if (row.dimensions_height !== undefined && row.dimensions_height !== null) {
    dimensions.height = Number(row.dimensions_height);
  }
  // Sleeping area
  if (row.dimensions_sleeping_area_width || row.dimensions_sleeping_area_length) {
    dimensions.sleeping_area = {
      width: Number(row.dimensions_sleeping_area_width) || 0,
      length: Number(row.dimensions_sleeping_area_length) || 0,
    };
  }
  if (Object.keys(dimensions).length > 0) {
    specs.dimensions = dimensions;
  }

  // Build material object from flat columns (for sofa categories)
  const isSofaCategory = ['sofas', 'corner_sofas', 'sofa_beds'].includes(category);
  if (isSofaCategory) {
    const material: Record<string, string> = {};
    if (row.material_type) material.type = row.material_type;
    if (row.material_composition) material.composition = row.material_composition;
    if (row.material_covers) material.covers = row.material_covers;
    if (row.material_backrest_filling) material.backrest_filling = row.material_backrest_filling;
    if (Object.keys(material).length > 0) {
      specs.material = material;
    }
  } else {
    // For non-sofa categories, material is a simple string
    if (row.material) specs.material = row.material;
    if (row.material_type) specs.material = row.material_type;
  }

  // Build inner_material object from flat columns (for sofa categories)
  if (isSofaCategory) {
    const innerMaterial: Record<string, string> = {};
    if (row.inner_material_structure) innerMaterial.structure = row.inner_material_structure;
    if (row.inner_material_cushion_filling) innerMaterial.cushion_filling = row.inner_material_cushion_filling;
    if (Object.keys(innerMaterial).length > 0) {
      specs.inner_material = innerMaterial;
    }
  }

  // Copy other simple fields
  if (row.construction) specs.construction = row.construction;
  if (row.additional_features) specs.additional_features = row.additional_features;
  if (row.has_shelves !== undefined) specs.has_shelves = Boolean(row.has_shelves);
  if (row.leg_height) specs.leg_height = row.leg_height;
  if (row.has_lift_mechanism !== undefined) specs.has_lift_mechanism = Boolean(row.has_lift_mechanism);
  if (row.armrest_type) specs.armrest_type = row.armrest_type;
  if (row.seat_height !== undefined && row.seat_height !== null) specs.seat_height = Number(row.seat_height);

  // Bed-specific fields
  if (row.headboard_type) specs.headboard_type = row.headboard_type;
  if (row.storage_options) specs.storage_options = row.storage_options;

  // Mattress-specific fields
  if (row.core_type) specs.core_type = row.core_type;
  if (row.hardness) specs.hardness = row.hardness;
  // Map hardness to firmness for form compatibility
  if (row.hardness) specs.firmness = row.hardness;

  // Table-specific fields
  if (row.shape) specs.shape = row.shape;
  if (row.extendable !== undefined) specs.extendable = Boolean(row.extendable);

  // Chair-specific fields
  if (row.upholstery) specs.upholstery = row.upholstery;
  if (row.weight_capacity !== undefined && row.weight_capacity !== null) specs.weight_capacity = Number(row.weight_capacity);

  // Wardrobe-specific fields
  if (row.door_count !== undefined && row.door_count !== null) specs.door_count = Number(row.door_count);
  if (row.door_type) specs.door_type = row.door_type;
  if (row.internal_layout) specs.internal_layout = row.internal_layout;

  // Accessory-specific fields
  if (row.mounting_type) specs.mounting_type = row.mounting_type;
  if (row.shelf_count !== undefined && row.shelf_count !== null) specs.shelf_count = Number(row.shelf_count);

  // Parse types array (stored as PostgreSQL array)
  if (row.types) {
    if (Array.isArray(row.types)) {
      specs.types = row.types;
    } else if (typeof row.types === 'string') {
      // Handle PostgreSQL array format like {value1,value2}
      if (row.types.startsWith('{') && row.types.endsWith('}')) {
        specs.types = row.types.slice(1, -1).split(',').filter(Boolean);
      } else {
        try {
          specs.types = JSON.parse(row.types);
        } catch {
          specs.types = row.types.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
      }
    }
  }

  return specs;
}
