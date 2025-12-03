/**
 * Сторінка редагування товару
 * Завантажує повні дані товару включаючи зображення, кольори та характеристики
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import ProductForm from '../../components/ProductForm';

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
    redirect('/admin-secret-2024/login');
  }

  if (!admin.permissions.includes('products.update')) {
    redirect('/admin-secret-2024/products');
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
    </div>
  );
}

// Helper function to get category-specific specs
async function getProductSpecs(productId: number, category: string) {
  const specTable = SPEC_TABLES[category];
  if (!specTable) return null;

  const result = await db.query(`
    SELECT * FROM ${specTable} WHERE product_id = $1
  `, [productId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Parse JSON fields
  const specs: Record<string, unknown> = { ...row };
  delete specs.id;
  delete specs.product_id;

  if (typeof specs.dimensions === 'string') {
    try {
      specs.dimensions = JSON.parse(specs.dimensions);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.material === 'string' && specs.material.startsWith('{')) {
    try {
      specs.material = JSON.parse(specs.material);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.inner_material === 'string') {
    try {
      specs.inner_material = JSON.parse(specs.inner_material);
    } catch { /* ignore parse errors */ }
  }

  if (typeof specs.types === 'string') {
    try {
      specs.types = JSON.parse(specs.types);
    } catch { /* ignore parse errors */ }
  }

  return specs;
}
