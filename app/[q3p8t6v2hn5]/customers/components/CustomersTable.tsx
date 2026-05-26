'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminPath } from '../../components/AdminPathProvider';

interface CustomerRow {
  id: string;
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  customer_type: 'individual' | 'business';
  company_name: string | null;
  tags: string[];
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

interface Props {
  customers: CustomerRow[];
  vipThreshold: number;
}

export default function CustomersTable({ customers, vipThreshold }: Props) {
  const adminPath = useAdminPath();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #ccc' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={thStyle}>Клієнт</th>
            <th style={thStyle}>Контакт</th>
            <th style={thStyle}>Сегмент</th>
            <th style={thStyle}>Замовлень</th>
            <th style={thStyle}>Сума</th>
            <th style={thStyle}>Останнє</th>
            <th style={thStyle}>Дії</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';
            return (
              <tr key={c.id}>
                <td style={tdStyle}>
                  <Link href={`${adminPath}/customers/${c.id}`} style={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {name}
                  </Link>
                  {c.customer_type === 'business' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>{c.company_name || 'Бізнес'}</div>
                  )}
                </td>
                <td style={tdStyle}>
                  <div>{c.phone}</div>
                  {c.email && <div style={{ fontSize: '12px', color: '#666' }}>{c.email}</div>}
                </td>
                <td style={tdStyle}>
                  <SegmentBadge totalOrders={c.total_orders} totalSpent={c.total_spent} vipThreshold={vipThreshold} />
                </td>
                <td style={tdStyle}>{c.total_orders}</td>
                <td style={tdStyle}>{formatCurrency(c.total_spent)}</td>
                <td style={tdStyle}>{isClient ? formatDate(c.last_order_at) : '...'}</td>
                <td style={tdStyle}>
                  <Link href={`${adminPath}/customers/${c.id}`} style={{ color: '#1976d2' }}>
                    Переглянути
                  </Link>
                </td>
              </tr>
            );
          })}
          {customers.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                Клієнтів не знайдено
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SegmentBadge({ totalOrders, totalSpent, vipThreshold }: { totalOrders: number; totalSpent: number; vipThreshold: number }) {
  let label = 'Новий';
  let color = { bg: '#fff3e0', text: '#e65100' };
  if (totalSpent >= vipThreshold) {
    label = 'VIP';
    color = { bg: '#f3e5f5', text: '#7b1fa2' };
  } else if (totalOrders >= 2) {
    label = 'Повторний';
    color = { bg: '#e8f5e9', text: '#2e7d32' };
  }
  return (
    <span style={{ backgroundColor: color.bg, color: color.text, padding: '4px 10px', fontWeight: 'bold', fontSize: '12px', borderRadius: '3px' }}>
      {label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  return `${formatted} грн`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
