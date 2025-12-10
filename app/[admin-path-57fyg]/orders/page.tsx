/**
 * Сторінка списку замовлень адмін-панелі
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { getAdminUrl } from '@/app/lib/admin-path';
import OrdersTable from './components/OrdersTable';
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
  const adminPath = getAdminUrl();

  if (!admin) {
    redirect(`${adminPath}/login`);
  }

  if (!admin.permissions.includes('orders.read')) {
    redirect(adminPath);
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
  const exportUrl = `/admin-path-57fyg/api/orders/export${exportParams.toString() ? '?' + exportParams.toString() : ''}`;

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
            href="/admin-path-57fyg/orders"
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
      <OrdersTable
        orders={orders}
        canDelete={admin.permissions.includes('orders.delete')}
      />

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

/**
 * Dynamic query builder for orders (Task 4)
 * Single code path that conditionally appends WHERE clauses
 * Uses parameterized queries throughout for SQL injection protection
 */
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
  // Build WHERE conditions dynamically
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Search filter (order number, email, phone)
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(`(order_number ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex} OR user_phone ILIKE $${paramIndex})`);
    params.push(searchPattern);
    paramIndex++;
  }

  // Order status filter
  if (status) {
    conditions.push(`order_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Payment status filter
  if (paymentStatus) {
    conditions.push(`payment_status = $${paramIndex}`);
    params.push(paymentStatus);
    paramIndex++;
  }

  // Date range filters
  if (dateFrom) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(dateFrom);
    paramIndex++;
  }

  if (dateTo) {
    const dateToEnd = `${dateTo}T23:59:59`;
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(dateToEnd);
    paramIndex++;
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Build count query
  const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;

  // Build select query with pagination
  const selectQuery = `
    SELECT id, order_number, user_name, user_surname, user_email, user_phone,
           total_amount, order_status, payment_status, created_at
    FROM orders
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  // Execute both queries with same condition params
  const countResult = await db.query(countQuery, params);
  const ordersResult = await db.query(selectQuery, [...params, limit, offset]);

  return {
    orders: ordersResult.rows,
    total: Number(countResult.rows[0]?.total) || 0,
  };
}

function buildPageUrl(page: number, params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `/admin-path-57fyg/orders?${searchParams.toString()}`;
}

const paginationLinkStyle = {
  padding: '8px 15px',
  backgroundColor: '#333',
  color: 'white',
  textDecoration: 'none',
};
