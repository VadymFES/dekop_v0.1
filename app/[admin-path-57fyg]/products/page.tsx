/**
 * Сторінка списку товарів адмін-панелі
 * Показує всі товари з фільтрацією та пагінацією
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 * Uses category cache (Task 3)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { getAdminUrl } from '@/app/lib/admin-path';
import { db } from '@/app/lib/db';
import { getCachedCategories, getCategoryDisplayName } from '@/app/lib/category-utils';
import ProductsTable from './components/ProductsTable';
import styles from '../styles/admin.module.css';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    low_stock?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(getAdminUrl('login'));
  }

  if (!admin.permissions.includes('products.read')) {
    redirect(getAdminUrl());
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const category = params.category || '';
  const lowStock = params.low_stock === 'true';
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get products
  const { products, total, categories } = await getProducts({
    page,
    limit,
    offset,
    search,
    category,
    lowStock,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Товари ({total})</h1>
        {admin.permissions.includes('products.create') && (
          <Link href={getAdminUrl('products/add')} className={styles.buttonAddLarge}>
            Додати товар
          </Link>
        )}
      </div>

      {/* Фільтри */}
      <div className={styles.card}>
        <form method="GET" className={styles.filtersForm}>
          <div>
            <label className={styles.labelSmall}>Пошук</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Назва товару..."
              className={`${styles.inputSmall} ${styles.filterInputWide}`}
            />
          </div>

          <div>
            <label className={styles.labelSmall}>Категорія</label>
            <select
              name="category"
              defaultValue={category}
              className={`${styles.select} ${styles.filterSelectMedium}`}
            >
              <option value="">Всі категорії</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{getCategoryDisplayName(cat)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="low_stock"
                value="true"
                defaultChecked={lowStock}
              />
              Мало на складі
            </label>
          </div>

          <button type="submit" className={styles.buttonFilter}>
            Фільтрувати
          </button>

          <Link href={getAdminUrl('products')} className={styles.buttonClear}>
            Очистити
          </Link>
        </form>
      </div>

      {/* Таблиця товарів */}
      <ProductsTable
        products={products}
        canDelete={admin.permissions.includes('products.delete')}
      />

      {/* Пагінація */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              className={styles.paginationLink}
            >
              Попередня
            </Link>
          )}
          <span className={styles.paginationText}>
            Сторінка {page} з {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              className={styles.paginationLink}
            >
              Наступна
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  created_at: string;
  updated_at: string;
}

async function getProducts({
  limit,
  offset,
  search,
  category,
  lowStock,
}: {
  page: number;
  limit: number;
  offset: number;
  search: string;
  category: string;
  lowStock: boolean;
}) {
  // Build WHERE clause dynamically
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    values.push(category);
    paramIndex++;
  }

  if (lowStock) {
    whereClause += ` AND stock < 10`;
  }

  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
  const countResult = await db.query(countQuery, values);
  const total = Number(countResult.rows[0]?.total) || 0;

  // Get products (sorting is handled client-side)
  const productsQuery = `
    SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
    FROM products
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;

  const productsResult = await db.query(productsQuery, [...values, limit, offset]);

  // Get categories from cache (Task 3)
  const categories = await getCachedCategories();

  return {
    products: productsResult.rows,
    total,
    categories,
  };
}

function formatCategory(category: string): string {
  const categories: Record<string, string> = {
    sofas: 'Дивани',
    corner_sofas: 'Кутові дивани',
    sofa_beds: 'Дивани-ліжка',
    beds: 'Ліжка',
    tables: 'Столи',
    chairs: 'Стільці',
    mattresses: 'Матраци',
    wardrobes: 'Шафи',
    accessories: 'Аксесуари',
  };
  return categories[category] || category;
}

function buildPageUrl(page: number, params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `${getAdminUrl('products')}?${searchParams.toString()}`;
}
