/**
 * Сторінка додавання нового товару
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import ProductForm from '../components/ProductForm';

export default async function AddProductPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-path-57fyg/login');
  }

  if (!admin.permissions.includes('products.create')) {
    redirect('/admin-path-57fyg/products');
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Додати новий товар</h1>
      <ProductForm />
    </div>
  );
}
