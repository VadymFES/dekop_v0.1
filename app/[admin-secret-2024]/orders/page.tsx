/**
 * Admin Orders List Page
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-secret-2024/login');
  }

  if (!admin.permissions.includes('orders.read')) {
    redirect('/admin-secret-2024');
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const status = params.status || '';
  const paymentStatus = params.payment_status || '';
  const dateFrom = params.date_from || '';
  const dateTo = params.date_to || '';
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get orders
  const { orders, total } = await getOrders({
    page,
    limit,
    offset,
    search,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
  });

  const totalPages = Math.ceil(total / limit);

  // Build export URL with current filters
  const exportParams = new URLSearchParams();
  if (search) exportParams.set('search', search);
  if (status) exportParams.set('status', status);
  if (paymentStatus) exportParams.set('payment_status', paymentStatus);
  if (dateFrom) exportParams.set('date_from', dateFrom);
  if (dateTo) exportParams.set('date_to', dateTo);
  const exportUrl = `/admin-secret-2024/api/orders/export${exportParams.toString() ? '?' + exportParams.toString() : ''}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Orders ({total})</h1>
        <a
          href={exportUrl}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            textDecoration: 'none',
            border: 'none',
          }}
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Search</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Order #, email, phone..."
              style={{ padding: '8px', border: '1px solid #ccc', width: '180px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Status</label>
            <select
              name="status"
              defaultValue={status}
              style={{ padding: '8px', border: '1px solid #ccc', width: '130px' }}
            >
              <option value="">All</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Payment</label>
            <select
              name="payment_status"
              defaultValue={paymentStatus}
              style={{ padding: '8px', border: '1px solid #ccc', width: '120px' }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>From</label>
            <input
              type="date"
              name="date_from"
              defaultValue={dateFrom}
              style={{ padding: '8px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>To</label>
            <input
              type="date"
              name="date_to"
              defaultValue={dateTo}
              style={{ padding: '8px', border: '1px solid #ccc' }}
            />
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
            href="/admin-secret-2024/orders"
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

      {/* Orders Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>Order #</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Payment</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order: Order) => (
              <tr key={order.id}>
                <td style={tdStyle}>
                  <Link href={`/admin-secret-2024/orders/${order.id}`} style={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {order.order_number}
                  </Link>
                </td>
                <td style={tdStyle}>{order.user_name} {order.user_surname}</td>
                <td style={tdStyle}>
                  <div>{order.user_email}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{order.user_phone}</div>
                </td>
                <td style={tdStyle}>{formatCurrency(order.total_amount)}</td>
                <td style={tdStyle}>
                  <StatusBadge status={order.order_status} />
                </td>
                <td style={tdStyle}>
                  <PaymentBadge status={order.payment_status} />
                </td>
                <td style={tdStyle}>{formatDate(order.created_at)}</td>
                <td style={tdStyle}>
                  <Link href={`/admin-secret-2024/orders/${order.id}`} style={{ color: '#1976d2' }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  No orders found
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
              href={buildPageUrl(page - 1, { search, status, payment_status: paymentStatus, date_from: dateFrom, date_to: dateTo })}
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
              href={buildPageUrl(page + 1, { search, status, payment_status: paymentStatus, date_from: dateFrom, date_to: dateTo })}
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

interface Order {
  id: string;
  order_number: string;
  user_name: string;
  user_surname: string;
  user_email: string;
  user_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

async function getOrders({
  limit,
  offset,
  search,
  status,
  paymentStatus,
  dateFrom,
  dateTo,
}: {
  page: number;
  limit: number;
  offset: number;
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}) {
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (order_number ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex} OR user_phone ILIKE $${paramIndex})`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND order_status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (paymentStatus) {
    whereClause += ` AND payment_status = $${paramIndex}`;
    values.push(paymentStatus);
    paramIndex++;
  }

  if (dateFrom) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    values.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    values.push(dateTo + 'T23:59:59');
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
  const countResult = await db.query(countQuery, values);
  const total = Number(countResult.rows[0]?.total) || 0;

  const ordersQuery = `
    SELECT id, order_number, user_name, user_surname, user_email, user_phone,
           total_amount, order_status, payment_status, created_at
    FROM orders
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  const ordersResult = await db.query(ordersQuery, [...values, limit, offset]);

  return {
    orders: ordersResult.rows,
    total,
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    processing: '#ff9800',
    confirmed: '#2196f3',
    shipped: '#9c27b0',
    delivered: '#4caf50',
    cancelled: '#f44336',
  };
  return <span style={{ color: colors[status] || '#333', fontWeight: 'bold' }}>{status}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#ff9800',
    paid: '#4caf50',
    failed: '#f44336',
    refunded: '#9c27b0',
  };
  return <span style={{ color: colors[status] || '#333' }}>{status}</span>;
}

function buildPageUrl(page: number, params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `/admin-secret-2024/orders?${searchParams.toString()}`;
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
