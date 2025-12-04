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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Товари ({total})</h1>
        {admin.permissions.includes('products.create') && (
          <Link
            href="/admin-path-57fyg/products/add"
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              textDecoration: 'none',
              border: 'none',
            }}
          >
            Додати товар
          </Link>
        )}
      </div>

      {/* Фільтри */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label className={styles.labelSmall}>Пошук</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Назва товару..."
              className={styles.inputSmall}
              style={{ width: '200px' }}
            />
          </div>

          <div>
            <label className={styles.labelSmall}>Категорія</label>
            <select
              name="category"
              defaultValue={category}
              className={styles.select}
              style={{ width: '150px', padding: '10px 12px' }}
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

          <button
            type="submit"
            style={{
              padding: '8px 20px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Фільтрувати
          </button>

          <Link
            href="/admin-path-57fyg/products"
            style={{
              padding: '8px 20px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              textDecoration: 'none',
              border: '1px solid #ccc',
            }}
          >
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
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              style={paginationLinkStyle}
            >
              Попередня
            </Link>
          )}
          <span style={{ padding: '8px 15px' }}>
            Сторінка {page} з {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              style={paginationLinkStyle}
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const paginationLinkStyle = {
  padding: '8px 15px',
  backgroundColor: '#333',
  color: 'white',
  textDecoration: 'none',
};
