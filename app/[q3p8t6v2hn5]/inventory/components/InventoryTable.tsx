'use client';

import Link from 'next/link';
import type { InventoryProduct } from '@/app/lib/definitions';

interface Props {
  products: InventoryProduct[];
  adminPath: string;
}

function StockStatus({ product }: { product: InventoryProduct }) {
  if (product.stock <= 0) {
    return <span style={{ color: '#dc2626', fontWeight: 600 }}>Немає</span>;
  }
  if (product.reorder_level > 0 && product.stock <= product.reorder_level) {
    return <span style={{ color: '#d97706', fontWeight: 600 }}>Мало ({product.stock})</span>;
  }
  return <span style={{ color: '#16a34a' }}>{product.stock}</span>;
}

export default function InventoryTable({ products, adminPath }: Props) {
  if (!products.length) {
    return <p style={{ color: '#6b7280', marginTop: '2rem' }}>Товарів не знайдено.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem' }}>Назва</th>
            <th style={{ padding: '0.75rem 1rem' }}>Категорія</th>
            <th style={{ padding: '0.75rem 1rem' }}>Залишок</th>
            <th style={{ padding: '0.75rem 1rem' }}>Мін. запас</th>
            <th style={{ padding: '0.75rem 1rem' }}>Поповнення</th>
            <th style={{ padding: '0.75rem 1rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem 1rem' }}>{p.name}</td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{p.category}</td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <StockStatus product={p} />
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                {p.reorder_level > 0 ? p.reorder_level : '—'}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                {p.reorder_qty > 0 ? p.reorder_qty : '—'}
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <Link
                  href={`${adminPath}/inventory/${p.id}`}
                  style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.85rem' }}
                >
                  Деталі
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
