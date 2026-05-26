import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { getAdminUrl } from '@/app/lib/admin-path';
import type { Customer, CustomerOrderSummary } from '@/app/lib/definitions';
import CustomerForm from './CustomerForm';
import styles from '../../styles/admin.module.css';

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) redirect(`${adminPath}/login`);

  const { customerId } = await params;

  const customerResult = await db.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
  if (customerResult.rows.length === 0) notFound();
  const customer = customerResult.rows[0] as Customer;

  const ordersResult = await db.query(
    `SELECT id, order_number, total_amount, order_status, payment_status, created_at
     FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId],
  );
  const orders = ordersResult.rows as CustomerOrderSummary[];

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.phone;

  return (
    <div>
      <div className={styles.mb20}>
        <Link href={getAdminUrl('customers')} className={styles.link}>← Назад до клієнтів</Link>
      </div>

      <h1 className={`${styles.pageTitle} ${styles.mb20}`}>{name}</h1>

      <div className={styles.flexRow} style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
          <CustomerForm customer={customer} />
        </div>

        <div style={{ flex: '2 1 480px', minWidth: '320px' }}>
          <div className={`${styles.statsGrid} ${styles.mb20}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Замовлень</div>
              <div className={styles.statValue}>{customer.total_orders}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Сума покупок</div>
              <div className={styles.statValue}>{formatCurrency(customer.total_spent)}</div>
            </div>
          </div>

          <h2 className={`${styles.pageTitleSmall}`}>Історія замовлень</h2>
          <div className={styles.cardNoPadding}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.th}>№</th>
                  <th className={styles.th}>Сума</th>
                  <th className={styles.th}>Статус</th>
                  <th className={styles.th}>Оплата</th>
                  <th className={styles.th}>Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className={styles.td}>
                      <Link href={`${adminPath}/orders/${o.id}`} className={styles.link} style={{ fontWeight: 'bold' }}>
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className={styles.td}>{formatCurrency(o.total_amount)}</td>
                    <td className={styles.td}>{o.order_status}</td>
                    <td className={styles.td}>{o.payment_status}</td>
                    <td className={styles.td}>{new Date(o.created_at).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.tdEmpty}>Замовлень ще немає</td>
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

function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)} грн`;
}
