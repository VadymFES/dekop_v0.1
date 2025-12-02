/**
 * Admin Add Product Page
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import ProductForm from '../components/ProductForm';

export default async function AddProductPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-secret-2024/login');
  }

  if (!admin.permissions.includes('products.create')) {
    redirect('/admin-secret-2024/products');
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Add New Product</h1>
      <ProductForm />
    </div>
  );
}
