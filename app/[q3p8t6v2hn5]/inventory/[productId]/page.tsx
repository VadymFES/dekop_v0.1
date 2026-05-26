import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { sql } from '@vercel/postgres';
import { getAdminUrl } from '@/app/lib/admin-path';
import StockAdjustmentForm from './StockAdjustmentForm';
import styles from '../../styles/admin.module.css';

interface PageProps {
  params: Promise<{ productId: string }>;
}

function movementLabel(type: string) {
  const map: Record<string, string> = {
    purchase_in: 'Прихід',
    order_out: 'Продаж',
    adjustment: 'Коригування',
    return_in: 'Повернення',
  };
  return map[type] ?? type;
}

function movementColor(type: string) {
  return type === 'order_out' ? '#dc2626' : '#16a34a';
}

export default async function InventoryProductPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) redirect(`${adminPath}/login`);

  const { productId } = await params;
  const id = parseInt(productId, 10);
  if (isNaN(id)) notFound();

  const [productRes, movementsRes] = await Promise.all([
    sql`SELECT id, name, slug, category, stock, reorder_level, reorder_qty FROM products WHERE id = ${id}`,
    sql`SELECT sm.id, sm.type, sm.quantity, sm.reference_type, sm.reference_id,
               sm.notes, sm.created_by, sm.created_at
        FROM stock_movements sm
        WHERE sm.product_id = ${id}
        ORDER BY sm.created_at DESC
        LIMIT 100`,
  ]);

  if (!productRes.rows[0]) notFound();

  const product = productRes.rows[0];
  const movements = movementsRes.rows;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <Link href={`${adminPath}/inventory`} className={styles.backLink}>← Склад</Link>
        <h1 className={styles.pageTitle}>{product.name}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Залишок</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{product.stock}</div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Мін. запас</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{product.reorder_level}</div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Рекомендоване поповнення</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{product.reorder_qty}</div>
        </div>
      </div>

      <StockAdjustmentForm
        productId={product.id as number}
        currentStock={product.stock as number}
        reorderLevel={product.reorder_level as number}
        reorderQty={product.reorder_qty as number}
        adminPath={adminPath}
      />

      <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>Рухи товару</h2>

      {movements.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Рухів ще немає.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem' }}>Тип</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Кількість</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Джерело</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Нотатка</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Ким</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id as string} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{movementLabel(m.type as string)}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: movementColor(m.type as string), fontWeight: 600 }}>
                    {(m.quantity as number) > 0 ? `+${m.quantity}` : String(m.quantity)}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                    {m.reference_type ? `${m.reference_type} #${m.reference_id}` : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#374151' }}>{(m.notes as string) || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                    {(m.created_by as string) || '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>
                    {new Date(m.created_at as string).toLocaleString('uk-UA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
