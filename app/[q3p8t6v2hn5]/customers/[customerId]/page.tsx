/**
 * Сторінка деталей клієнта адмін-панелі (CRM)
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { getAdminUrl } from '@/app/lib/admin-path';
import type { Customer, CustomerOrderSummary } from '@/app/lib/definitions';
import CustomerForm from './CustomerForm';

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) {
    redirect(`${adminPath}/login`);
  }

  const { customerId } = await params;

  const customerResult = await db.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
  if (customerResult.rows.length === 0) {
    notFound();
  }
  const customer = customerResult.rows[0] as Customer;

  const ordersResult = await db.query(
    `SELECT id, order_number, total_amount, order_status, payment_status, created_at
     FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId],
  );
  const orders = ordersResult.rows as CustomerOrderSummary[];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link href={getAdminUrl('customers')} style={{ color: '#1976d2' }}>← Назад до клієнтів</Link>
      </div>

      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.phone}
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Editable profile */}
        <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
          <CustomerForm customer={customer} />
        </div>

        {/* Order history */}
        <div style={{ flex: '2 1 480px', minWidth: '320px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <StatCard label="Замовлень" value={String(customer.total_orders)} />
            <StatCard label="Сума покупок" value={formatCurrency(customer.total_spent)} />
          </div>

          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Історія замовлень</h2>
          <div style={{ backgroundColor: 'white', border: '1px solid #ccc' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={thStyle}>№</th>
                  <th style={thStyle}>Сума</th>
                  <th style={thStyle}>Статус</th>
                  <th style={thStyle}>Оплата</th>
                  <th style={thStyle}>Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={tdStyle}>
                      <Link href={`${adminPath}/orders/${o.id}`} style={{ color: '#1976d2', fontWeight: 'bold' }}>
                        #{o.order_number}
                      </Link>
                    </td>
                    <td style={tdStyle}>{formatCurrency(o.total_amount)}</td>
                    <td style={tdStyle}>{o.order_status}</td>
                    <td style={tdStyle}>{o.payment_status}</td>
                    <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                      Замовлень ще немає
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '16px', flex: 1 }}>
      <div style={{ fontSize: '13px', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  return `${formatted} грн`;
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
