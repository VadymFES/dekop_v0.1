/**
 * Admin Products List Page
 * Shows all products with filtering and pagination
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

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
        <h1 style={{ fontSize: '24px', margin: 0 }}>Products ({total})</h1>
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
            Add Product
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Search</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Product name..."
              style={{ padding: '8px', border: '1px solid #ccc', width: '200px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Category</label>
            <select
              name="category"
              defaultValue={category}
              style={{ padding: '8px', border: '1px solid #ccc', width: '150px' }}
            >
              <option value="">All categories</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
              <input
                type="checkbox"
                name="low_stock"
                value="true"
                defaultChecked={lowStock}
              />
              Low stock only
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
            Filter
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
            Clear
          </Link>
        </form>
      </div>

      {/* Products Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Stock</th>
              <th style={thStyle}>Flags</th>
              <th style={thStyle}>Actions</th>
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
                <td style={tdStyle}>{product.category}</td>
                <td style={tdStyle}>{formatCurrency(product.price)}</td>
                <td style={{
                  ...tdStyle,
                  color: product.stock === 0 ? '#f44336' : product.stock < 10 ? '#ff9800' : '#333',
                  fontWeight: product.stock < 10 ? 'bold' : 'normal',
                }}>
                  {product.stock}
                </td>
                <td style={tdStyle}>
                  {product.is_on_sale && <span style={{ color: '#f44336', marginRight: '5px' }}>SALE</span>}
                  {product.is_new && <span style={{ color: '#4caf50', marginRight: '5px' }}>NEW</span>}
                  {product.is_bestseller && <span style={{ color: '#ff9800' }}>BEST</span>}
                </td>
                <td style={tdStyle}>
                  <Link
                    href={`/admin-secret-2024/products/${product.id}/edit`}
                    style={{ color: '#1976d2', marginRight: '10px' }}
                  >
                    Edit
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
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              style={paginationLinkStyle}
            >
              Previous
            </Link>
          )}
          <span style={{ padding: '8px 15px' }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1, { search, category, low_stock: lowStock ? 'true' : '' })}
              style={paginationLinkStyle}
            >
              Next
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
  page,
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
  // Build query
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

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
  const countResult = await db.query(countQuery, values);
  const total = Number(countResult.rows[0]?.total) || 0;

  // Get products
  const productsQuery = `
    SELECT id, name, slug, category, price, stock, is_on_sale, is_new, is_bestseller
    FROM products
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  const productsResult = await db.query(productsQuery, [...values, limit, offset]);

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

function DeleteButton({ productId, productName }: { productId: number; productName: string }) {
  return (
    <form
      action={`/admin-secret-2024/api/products/${productId}`}
      method="POST"
      style={{ display: 'inline' }}
      onSubmit={(e) => {
        if (!confirm(`Delete "${productName}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        style={{
          color: '#f44336',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Delete
      </button>
    </form>
  );
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
