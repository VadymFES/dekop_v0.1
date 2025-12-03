/**
 * Сторінка списку товарів адмін-панелі
 * Показує всі товари з фільтрацією та пагінацією
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import DeleteButton from './components/DeleteButton';
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
    redirect('/admin-secret-2024/login');
  }

  if (!admin.permissions.includes('products.read')) {
    redirect('/admin-secret-2024');
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
            href="/admin-secret-2024/products/add"
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
            href="/admin-secret-2024/products"
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
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Назва</th>
              <th style={thStyle}>Категорія</th>
              <th style={thStyle}>Ціна</th>
              <th style={thStyle}>Запас</th>
              <th style={thStyle}>Мітки</th>
              <th style={thStyle}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product: Product) => (
              <tr key={product.id}>
                <td style={tdStyle}>{product.id}</td>
                <td style={tdStyle}>
                  <div>{product.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{product.slug}</div>
                </td>
                <td style={tdStyle}>{formatCategory(product.category)}</td>
                <td style={tdStyle}>{formatCurrency(product.price)}</td>
                <td style={{
                  ...tdStyle,
                  color: product.stock === 0 ? '#f44336' : product.stock < 10 ? '#ff9800' : '#333',
                  fontWeight: product.stock < 10 ? 'bold' : 'normal',
                }}>
                  {product.stock}
                </td>
                <td style={tdStyle}>
                  {product.is_on_sale && <span style={{ color: '#f44336', marginRight: '5px' }}>АКЦІЯ</span>}
                  {product.is_new && <span style={{ color: '#4caf50', marginRight: '5px' }}>НОВИНКА</span>}
                  {product.is_bestseller && <span style={{ color: '#ff9800' }}>ХІТ</span>}
                </td>
                <td style={tdStyle}>
                  <Link
                    href={`/admin-secret-2024/products/${product.id}/edit`}
                    style={{ color: '#1976d2', marginRight: '10px' }}
                  >
                    Редагувати
                  </Link>
                  {admin.permissions.includes('products.delete') && (
                    <DeleteButton productId={product.id} productName={product.name} />
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  Товарів не знайдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
      FROM products
      WHERE stock < 10
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    // No filters
    countResult = await db.query`SELECT COUNT(*) as total FROM products`;
    productsResult = await db.query`
      SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
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
  return `/admin-secret-2024/products?${searchParams.toString()}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const thStyle = {
  padding: '12px 10px',
  textAlign: 'left' as const,
  borderBottom: '2px solid #ccc',
  fontSize: '14px',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
  fontSize: '14px',
};

const paginationLinkStyle = {
  padding: '8px 15px',
  backgroundColor: '#333',
  color: 'white',
  textDecoration: 'none',
};
