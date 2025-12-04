/**
 * Сторінка списку товарів адмін-панелі
 * Показує всі товари з фільтрацією та пагінацією
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
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
    redirect('/admin-path-57fyg/login');
  }

  if (!admin.permissions.includes('products.read')) {
    redirect('/admin-path-57fyg');
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
          <Link href="/admin-path-57fyg/products/add" className={styles.buttonAddLarge}>
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
                <option key={cat} value={cat}>{formatCategory(cat)}</option>
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

          <Link href="/admin-path-57fyg/products" className={styles.buttonClear}>
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
  let countResult;
  let productsResult;
  const searchPattern = `%${search}%`;

  // Using template literals to avoid prepared statement issues
  // Different query branches based on active filters
  if (search && category && lowStock) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND category = ${category}
        AND stock < 10
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND category = ${category}
        AND stock < 10
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (search && category) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND category = ${category}
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND category = ${category}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (search && lowStock) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND stock < 10
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
        AND stock < 10
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (category && lowStock) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products
      WHERE category = ${category} AND stock < 10
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE category = ${category} AND stock < 10
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (search) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE (name ILIKE ${searchPattern} OR slug ILIKE ${searchPattern})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (category) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products WHERE category = ${category}
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE category = ${category}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (lowStock) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM products WHERE stock < 10
    `;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      WHERE stock < 10
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    // No filters
    countResult = await db.query`SELECT COUNT(*) as total FROM products`;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller, created_at, updated_at
      FROM products
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  const total = Number(countResult.rows[0]?.total) || 0;

  // Get categories for filter
  const categoriesResult = await db.query`
    SELECT DISTINCT category FROM products ORDER BY category
  `;

  return {
    products: productsResult.rows,
    total,
    categories: categoriesResult.rows.map((r: { category: string }) => r.category),
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
  return `/admin-path-57fyg/products?${searchParams.toString()}`;
}
