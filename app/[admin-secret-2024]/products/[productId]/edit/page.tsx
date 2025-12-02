/**
 * Admin Edit Product Page
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import ProductForm from '../../components/ProductForm';

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
  const result = await db.query`
    SELECT id, name, slug, description, category, price, stock, is_on_sale, is_new, is_bestseller
    FROM products
    WHERE id = ${id}
  `;

  if (result.rows.length === 0) {
    notFound();
  }

  const product = result.rows[0];

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>
        Edit Product: {product.name}
      </h1>
      <ProductForm product={product} />
    </div>
  );
}
