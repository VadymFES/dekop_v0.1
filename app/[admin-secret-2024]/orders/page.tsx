/**
 * Сторінка списку замовлень адмін-панелі
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import styles from '../styles/admin.module.css';

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

  // Get orders using template literals for safe queries
  const { orders, total } = await getOrders({
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
        <h1 style={{ fontSize: '24px', margin: 0 }}>Замовлення ({total})</h1>
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
          Експорт CSV
        </a>
      </div>

      {/* Фільтри */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className={styles.labelSmall}>Пошук</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="№ замовлення, email, телефон..."
              className={styles.inputSmall}
              style={{ width: '180px' }}
            />
          </div>

          <div>
            <label className={styles.labelSmall}>Статус</label>
            <select
              name="status"
              defaultValue={status}
              className={styles.select}
              style={{ width: '130px', padding: '10px 12px' }}
            >
              <option value="">Всі</option>
              <option value="processing">В обробці</option>
              <option value="confirmed">Підтверджено</option>
              <option value="shipped">Відправлено</option>
              <option value="delivered">Доставлено</option>
              <option value="cancelled">Скасовано</option>
            </select>
          </div>

          <div>
            <label className={styles.labelSmall}>Оплата</label>
            <select
              name="payment_status"
              defaultValue={paymentStatus}
              className={styles.select}
              style={{ width: '120px', padding: '10px 12px' }}
            >
              <option value="">Всі</option>
              <option value="pending">Очікує</option>
              <option value="paid">Оплачено</option>
              <option value="failed">Помилка</option>
              <option value="refunded">Повернення</option>
            </select>
          </div>

          <div>
            <label className={styles.labelSmall}>Від</label>
            <input
              type="date"
              name="date_from"
              defaultValue={dateFrom}
              className={styles.inputSmall}
            />
          </div>

          <div>
            <label className={styles.labelSmall}>До</label>
            <input
              type="date"
              name="date_to"
              defaultValue={dateTo}
              className={styles.inputSmall}
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
            Фільтрувати
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
            Очистити
          </Link>
        </form>
      </div>

      {/* Таблиця замовлень */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={thStyle}>№ замовлення</th>
              <th style={thStyle}>Клієнт</th>
              <th style={thStyle}>Контакт</th>
              <th style={thStyle}>Сума</th>
              <th style={thStyle}>Статус</th>
              <th style={thStyle}>Оплата</th>
              <th style={thStyle}>Дата</th>
              <th style={thStyle}>Дії</th>
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
                    Переглянути
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  Замовлення не знайдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагінація */}
      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1, { search, status, payment_status: paymentStatus, date_from: dateFrom, date_to: dateTo })}
              style={paginationLinkStyle}
            >
              Попередня
            </Link>
          )}
          <span style={{ padding: '8px 15px' }}>
            Сторінка {page} з {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1, { search, status, payment_status: paymentStatus, date_from: dateFrom, date_to: dateTo })}
              style={paginationLinkStyle}
            >
              Наступна
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
  limit: number;
  offset: number;
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}) {
  // Use separate queries based on filters to avoid dynamic SQL issues
  const searchPattern = search ? `%${search}%` : null;
  const dateToEnd = dateTo ? `${dateTo}T23:59:59` : null;

  // Build result based on which filters are active
  let countResult;
  let ordersResult;

  if (searchPattern && status && paymentStatus && dateFrom && dateToEnd) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
        AND payment_status = ${paymentStatus}
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateToEnd}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
        AND payment_status = ${paymentStatus}
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateToEnd}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (searchPattern && status && paymentStatus) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
        AND payment_status = ${paymentStatus}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
        AND payment_status = ${paymentStatus}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (searchPattern && status) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND order_status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (searchPattern && paymentStatus) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND payment_status = ${paymentStatus}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE (order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern})
        AND payment_status = ${paymentStatus}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (status && paymentStatus) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE order_status = ${status} AND payment_status = ${paymentStatus}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE order_status = ${status} AND payment_status = ${paymentStatus}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (searchPattern) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE order_number ILIKE ${searchPattern} OR user_email ILIKE ${searchPattern} OR user_phone ILIKE ${searchPattern}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (status) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders WHERE order_status = ${status}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE order_status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (paymentStatus) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders WHERE payment_status = ${paymentStatus}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE payment_status = ${paymentStatus}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (dateFrom && dateToEnd) {
    countResult = await db.query`
      SELECT COUNT(*) as total FROM orders
      WHERE created_at >= ${dateFrom} AND created_at <= ${dateToEnd}
    `;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      WHERE created_at >= ${dateFrom} AND created_at <= ${dateToEnd}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    // No filters - get all orders
    countResult = await db.query`SELECT COUNT(*) as total FROM orders`;
    ordersResult = await db.query`
      SELECT id, order_number, user_name, user_surname, user_email, user_phone,
             total_amount, order_status, payment_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return {
    orders: ordersResult.rows,
    total: Number(countResult.rows[0]?.total) || 0,
  };
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
  return <span style={{ color: colors[status] || '#333', fontWeight: 'bold' }}>{labels[status] || status}</span>;
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
  return <span style={{ color: colors[status] || '#333' }}>{labels[status] || status}</span>;
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
