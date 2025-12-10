/**
 * Головна сторінка адмін-панелі
 * Показує ключові метрики та останні замовлення
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { getAdminUrl } from '@/app/lib/admin-path';
import styles from './styles/admin.module.css';

export default async function AdminDashboard() {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) {
    redirect(`${adminPath}/login`);
  }

  // Fetch dashboard metrics
  const metrics = await getDashboardMetrics();

  return (
    <div>
      <h1 className={`${styles.pageTitle} ${styles.mb30}`}>Головна панель</h1>

      {/* Картки статистики */}
      <div className={styles.statsGrid}>
        <StatCard label="Замовлень сьогодні" value={metrics.ordersToday} />
        <StatCard label="Замовлень за тиждень" value={metrics.ordersWeek} />
        <StatCard label="Замовлень за місяць" value={metrics.ordersMonth} />
        <StatCard label="Очікують обробки" value={metrics.pendingOrders} variant="warning" />
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Дохід сьогодні" value={formatCurrency(metrics.revenueToday)} />
        <StatCard label="Дохід за тиждень" value={formatCurrency(metrics.revenueWeek)} />
        <StatCard label="Дохід за місяць" value={formatCurrency(metrics.revenueMonth)} />
        <StatCard label="Мало на складі" value={metrics.lowStockProducts} variant="danger" />
      </div>

      {/* Останні замовлення */}
      <div className={`${styles.card} ${styles.mb30}`}>
        <h2 className={styles.pageTitleSmall}>Останні замовлення</h2>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>№ замовлення</th>
              <th className={styles.th}>Клієнт</th>
              <th className={styles.th}>Сума</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Оплата</th>
              <th className={styles.th}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {metrics.recentOrders.map((order) => (
              <tr key={order.id}>
                <td className={styles.td}>
                  <Link href={`${adminPath}/orders/${order.id}`} className={styles.link}>
                    {order.order_number}
                  </Link>
                </td>
                <td className={styles.td}>{order.user_name} {order.user_surname}</td>
                <td className={styles.td}>{formatCurrency(order.total_amount)}</td>
                <td className={styles.td}>
                  <StatusBadge status={order.order_status} />
                </td>
                <td className={styles.td}>
                  <PaymentBadge status={order.payment_status} />
                </td>
                <td className={styles.td}>{formatDate(order.created_at)}</td>
              </tr>
            ))}
            {metrics.recentOrders.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.tdEmpty}>
                  Замовлень ще немає
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Товари з малим запасом */}
      {metrics.lowStockProductsList.length > 0 && (
        <div className={styles.card}>
          <h2 className={`${styles.pageTitleSmall} ${styles.statusCancelled}`}>
            Товари з малим запасом (менше 10)
          </h2>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeader}>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>Назва</th>
                <th className={styles.th}>Категорія</th>
                <th className={styles.th}>Запас</th>
                <th className={styles.th}>Дія</th>
              </tr>
            </thead>
            <tbody>
              {metrics.lowStockProductsList.map((product) => (
                <tr key={product.id}>
                  <td className={styles.td}>{product.id}</td>
                  <td className={styles.td}>{product.name}</td>
                  <td className={styles.td}>{product.category}</td>
                  <td className={product.stock === 0 ? styles.stockOut : styles.stockLow}>
                    {product.stock}
                  </td>
                  <td className={styles.td}>
                    <Link href={`${adminPath}/products/${product.id}/edit`} className={styles.link}>
                      Редагувати
                    </Link>
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

// Допоміжні компоненти
function StatCard({ label, value, variant }: { label: string; value: string | number; variant?: 'warning' | 'danger' }) {
  const valueClass = variant === 'warning'
    ? styles.statValueWarning
    : variant === 'danger'
    ? styles.statValueDanger
    : styles.statValue;

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={valueClass}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    processing: 'В обробці',
    confirmed: 'Підтверджено',
    shipped: 'Відправлено',
    delivered: 'Доставлено',
    cancelled: 'Скасовано',
  };
  const statusClasses: Record<string, string> = {
    processing: styles.statusProcessing,
    confirmed: styles.statusConfirmed,
    shipped: styles.statusShipped,
    delivered: styles.statusDelivered,
    cancelled: styles.statusCancelled,
  };
  return (
    <span className={statusClasses[status] || ''}>
      {labels[status] || status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Очікує',
    paid: 'Оплачено',
    failed: 'Помилка',
    refunded: 'Повернення',
  };
  const statusClasses: Record<string, string> = {
    pending: styles.paymentPending,
    paid: styles.paymentPaid,
    failed: styles.paymentFailed,
    refunded: styles.paymentRefunded,
  };
  return (
    <span className={statusClasses[status] || ''}>
      {labels[status] || status}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get dashboard metrics with parallel query execution (Task 5)
 * Uses Promise.all() for independent queries with error isolation
 */
async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Execute all independent queries in parallel (Task 5)
  // Each query is wrapped to handle individual failures without crashing the dashboard
  const [
    ordersResult,
    lowStockResult,
    recentOrdersResult,
    lowStockProductsResult,
  ] = await Promise.all([
    // Order statistics (aggregated query)
    db.query`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${today.toISOString()}) as orders_today,
        COUNT(*) FILTER (WHERE created_at >= ${weekAgo.toISOString()}) as orders_week,
        COUNT(*) FILTER (WHERE created_at >= ${monthAgo.toISOString()}) as orders_month,
        COUNT(*) FILTER (WHERE order_status = 'processing') as pending_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${today.toISOString()} AND payment_status = 'paid'), 0) as revenue_today,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${weekAgo.toISOString()} AND payment_status = 'paid'), 0) as revenue_week,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${monthAgo.toISOString()} AND payment_status = 'paid'), 0) as revenue_month
      FROM orders
    `.catch(err => {
      console.error('Failed to fetch order statistics:', err);
      return { rows: [{}] };
    }),

    // Low stock count
    db.query`
      SELECT COUNT(*) as count FROM products WHERE stock < 10
    `.catch(err => {
      console.error('Failed to fetch low stock count:', err);
      return { rows: [{ count: 0 }] };
    }),

    // Recent orders
    db.query`
      SELECT id, order_number, user_name, user_surname, total_amount, order_status, payment_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `.catch(err => {
      console.error('Failed to fetch recent orders:', err);
      return { rows: [] };
    }),

    // Low stock products list
    db.query`
      SELECT id, name, category, stock
      FROM products
      WHERE stock < 10
      ORDER BY stock ASC
      LIMIT 10
    `.catch(err => {
      console.error('Failed to fetch low stock products:', err);
      return { rows: [] };
    }),
  ]);

  const stats = ordersResult.rows[0] || {};

  return {
    ordersToday: Number(stats.orders_today) || 0,
    ordersWeek: Number(stats.orders_week) || 0,
    ordersMonth: Number(stats.orders_month) || 0,
    pendingOrders: Number(stats.pending_orders) || 0,
    revenueToday: Number(stats.revenue_today) || 0,
    revenueWeek: Number(stats.revenue_week) || 0,
    revenueMonth: Number(stats.revenue_month) || 0,
    lowStockProducts: Number(lowStockResult.rows[0]?.count) || 0,
    recentOrders: recentOrdersResult.rows,
    lowStockProductsList: lowStockProductsResult.rows,
  };
}
