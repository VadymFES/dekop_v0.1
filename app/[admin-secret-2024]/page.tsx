/**
 * Admin Dashboard Page
 * Shows key metrics and recent orders
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

export default async function AdminDashboard() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-secret-2024/login');
  }

  // Fetch dashboard metrics
  const metrics = await getDashboardMetrics();

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Dashboard</h1>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <StatCard label="Orders Today" value={metrics.ordersToday} />
        <StatCard label="Orders This Week" value={metrics.ordersWeek} />
        <StatCard label="Orders This Month" value={metrics.ordersMonth} />
        <StatCard label="Pending Orders" value={metrics.pendingOrders} color="#ff9800" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <StatCard label="Revenue Today" value={formatCurrency(metrics.revenueToday)} />
        <StatCard label="Revenue This Week" value={formatCurrency(metrics.revenueWeek)} />
        <StatCard label="Revenue This Month" value={formatCurrency(metrics.revenueMonth)} />
        <StatCard label="Low Stock Products" value={metrics.lowStockProducts} color="#f44336" />
      </div>

      {/* Recent Orders */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '30px',
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Orders</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>Order #</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Payment</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {metrics.recentOrders.map((order) => (
              <tr key={order.id}>
                <td style={tdStyle}>
                  <a href={`/admin-secret-2024/orders/${order.id}`} style={{ color: '#1976d2' }}>
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
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Low Stock Products */}
      {metrics.lowStockProductsList.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          padding: '20px',
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#f44336' }}>
            Low Stock Products (less than 10)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Stock</th>
                <th style={thStyle}>Action</th>
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
                    <a href={`/admin-secret-2024/products/${product.id}/edit`} style={{ color: '#1976d2' }}>
                      Edit
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

// Helper components
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
  const colors: Record<string, string> = {
    processing: '#ff9800',
    confirmed: '#2196f3',
    shipped: '#9c27b0',
    delivered: '#4caf50',
    cancelled: '#f44336',
  };
  return (
    <span style={{ color: colors[status] || '#333' }}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#ff9800',
    paid: '#4caf50',
    failed: '#f44336',
    refunded: '#9c27b0',
  };
  return (
    <span style={{ color: colors[status] || '#333' }}>
      {status}
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

// Data fetching
async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Orders counts
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

  // Low stock products count
  const lowStockResult = await db.query`
    SELECT COUNT(*) as count FROM products WHERE stock < 10
  `;

  // Recent orders
  const recentOrdersResult = await db.query`
    SELECT id, order_number, user_name, user_surname, total_amount, order_status, payment_status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10
  `;

  // Low stock products list
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
