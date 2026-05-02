/**
 * Сторінка додавання нового товару
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { getAdminUrl } from '@/app/lib/admin-path';
import ProductForm from '../components/ProductForm';

export default async function AddProductPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(getAdminUrl('login'));
  }

  if (!admin.permissions.includes('products.create')) {
    redirect(getAdminUrl('products'));
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Додати новий товар</h1>
      <ProductForm />
    </div>
  );
}
