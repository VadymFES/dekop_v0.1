/**
 * Головна сторінка адмін-панелі
 * Показує ключові метрики та останні замовлення
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export default async function AdminDashboard() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-path-57fyg/login');
  }

  // Fetch dashboard metrics
  const metrics = await getDashboardMetrics();

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Головна панель</h1>

      {/* Картки статистики */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <StatCard label="Замовлень сьогодні" value={metrics.ordersToday} />
        <StatCard label="Замовлень за тиждень" value={metrics.ordersWeek} />
        <StatCard label="Замовлень за місяць" value={metrics.ordersMonth} />
        <StatCard label="Очікують обробки" value={metrics.pendingOrders} color="#ff9800" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <StatCard label="Дохід сьогодні" value={formatCurrency(metrics.revenueToday)} />
        <StatCard label="Дохід за тиждень" value={formatCurrency(metrics.revenueWeek)} />
        <StatCard label="Дохід за місяць" value={formatCurrency(metrics.revenueMonth)} />
        <StatCard label="Мало на складі" value={metrics.lowStockProducts} color="#f44336" />
      </div>

      {/* Останні замовлення */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '30px',
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Останні замовлення</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>№ замовлення</th>
              <th style={thStyle}>Клієнт</th>
              <th style={thStyle}>Сума</th>
              <th style={thStyle}>Статус</th>
              <th style={thStyle}>Оплата</th>
              <th style={thStyle}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {metrics.recentOrders.map((order) => (
              <tr key={order.id}>
                <td style={tdStyle}>
                  <a href={`/admin-path-57fyg/orders/${order.id}`} style={{ color: '#1976d2' }}>
                    {order.order_number}
                  </a>
                </td>
                <td style={tdStyle}>{order.user_name} {order.user_surname}</td>
                <td style={tdStyle}>{formatCurrency(order.total_amount)}</td>
                <td style={tdStyle}>
                  <StatusBadge status={order.order_status} />
                </td>
                <td style={tdStyle}>
                  <PaymentBadge status={order.payment_status} />
                </td>
                <td style={tdStyle}>{formatDate(order.created_at)}</td>
              </tr>
            ))}
            {metrics.recentOrders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  Замовлень ще немає
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Товари з малим запасом */}
      {metrics.lowStockProductsList.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          padding: '20px',
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#f44336' }}>
            Товари з малим запасом (менше 10)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Назва</th>
                <th style={thStyle}>Категорія</th>
                <th style={thStyle}>Запас</th>
                <th style={thStyle}>Дія</th>
              </tr>
            </thead>
            <tbody>
              {metrics.lowStockProductsList.map((product) => (
                <tr key={product.id}>
                  <td style={tdStyle}>{product.id}</td>
                  <td style={tdStyle}>{product.name}</td>
                  <td style={tdStyle}>{product.category}</td>
                  <td style={{ ...tdStyle, color: product.stock === 0 ? '#f44336' : '#ff9800', fontWeight: 'bold' }}>
                    {product.stock}
                  </td>
                  <td style={tdStyle}>
                    <a href={`/admin-path-57fyg/products/${product.id}/edit`} style={{ color: '#1976d2' }}>
                      Редагувати
                    </a>
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
function StatCard({ label, value, color = '#333' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ccc',
      padding: '20px',
    }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
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
  const colors: Record<string, string> = {
    processing: '#ff9800',
    confirmed: '#2196f3',
    shipped: '#9c27b0',
    delivered: '#4caf50',
    cancelled: '#f44336',
  };
  return (
    <span style={{ color: colors[status] || '#333' }}>
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
  const colors: Record<string, string> = {
    pending: '#ff9800',
    paid: '#4caf50',
    failed: '#f44336',
    refunded: '#9c27b0',
  };
  return (
    <span style={{ color: colors[status] || '#333' }}>
      {labels[status] || status}
    </span>
  );
}

const thStyle = {
  padding: '10px',
  textAlign: 'left' as const,
  borderBottom: '2px solid #ccc',
  fontSize: '14px',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
  fontSize: '14px',
};

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

// Отримання метрик
async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Статистика замовлень
  const ordersResult = await db.query`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${today.toISOString()}) as orders_today,
      COUNT(*) FILTER (WHERE created_at >= ${weekAgo.toISOString()}) as orders_week,
      COUNT(*) FILTER (WHERE created_at >= ${monthAgo.toISOString()}) as orders_month,
      COUNT(*) FILTER (WHERE order_status = 'processing') as pending_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${today.toISOString()} AND payment_status = 'paid'), 0) as revenue_today,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${weekAgo.toISOString()} AND payment_status = 'paid'), 0) as revenue_week,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${monthAgo.toISOString()} AND payment_status = 'paid'), 0) as revenue_month
    FROM orders
  `;

  // Кількість товарів з малим запасом
  const lowStockResult = await db.query`
    SELECT COUNT(*) as count FROM products WHERE stock < 10
  `;

  // Останні замовлення
  const recentOrdersResult = await db.query`
    SELECT id, order_number, user_name, user_surname, total_amount, order_status, payment_status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10
  `;

  // Список товарів з малим запасом
  const lowStockProductsResult = await db.query`
    SELECT id, name, category, stock
    FROM products
    WHERE stock < 10
    ORDER BY stock ASC
    LIMIT 10
  `;

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
