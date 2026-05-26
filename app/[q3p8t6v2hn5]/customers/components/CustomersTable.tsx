'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminPath } from '../../components/AdminPathProvider';
import styles from '../../styles/admin.module.css';

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

  useEffect(() => { setIsClient(true); }, []);

  return (
    <div className={styles.cardNoPadding}>
      <table className={styles.table}>
        <thead className={styles.tableHeader}>
          <tr>
            <th className={styles.th}>Клієнт</th>
            <th className={styles.th}>Контакт</th>
            <th className={styles.th}>Сегмент</th>
            <th className={styles.th}>Замовлень</th>
            <th className={styles.th}>Сума</th>
            <th className={styles.th}>Останнє</th>
            <th className={styles.th}>Дії</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';
            return (
              <tr key={c.id}>
                <td className={styles.td}>
                  <Link href={`${adminPath}/customers/${c.id}`} className={styles.link} style={{ fontWeight: 'bold' }}>
                    {name}
                  </Link>
                  {c.customer_type === 'business' && (
                    <div className={styles.tdSmall}>{c.company_name || 'Бізнес'}</div>
                  )}
                </td>
                <td className={styles.td}>
                  <div>{c.phone}</div>
                  {c.email && <div className={styles.slugText}>{c.email}</div>}
                </td>
                <td className={styles.td}>
                  <SegmentBadge totalOrders={c.total_orders} totalSpent={c.total_spent} vipThreshold={vipThreshold} />
                </td>
                <td className={styles.td}>{c.total_orders}</td>
                <td className={styles.td}>{formatCurrency(c.total_spent)}</td>
                <td className={styles.td}>{isClient ? formatDate(c.last_order_at) : '...'}</td>
                <td className={styles.td}>
                  <Link href={`${adminPath}/customers/${c.id}`} className={styles.link}>Переглянути</Link>
                </td>
              </tr>
            );
          })}
          {customers.length === 0 && (
            <tr>
              <td colSpan={7} className={styles.tdEmpty}>Клієнтів не знайдено</td>
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
    <span className={styles.badge} style={{ backgroundColor: color.bg, color: color.text, fontWeight: 'bold' }}>
      {label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)} грн`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
