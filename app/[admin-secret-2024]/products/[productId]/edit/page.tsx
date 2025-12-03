/**
 * Сторінка редагування товару
 * Завантажує повні дані товару включаючи зображення, кольори та характеристики
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import ProductForm from '../../components/ProductForm';

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

  // Get images
  const imagesResult = await db.query`
    SELECT id, image_url, alt, is_primary, display_order
    FROM product_images
    WHERE product_id = ${id}
    ORDER BY display_order ASC
  `;

  // Get colors
  const colorsResult = await db.query`
    SELECT color, image_url
    FROM product_spec_colors
    WHERE product_id = ${id}
  `;

  // Get specs based on category
  const specs = await getProductSpecs(id, product.category);

  // Build the full product object for the form
  const fullProduct = {
    ...product,
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
