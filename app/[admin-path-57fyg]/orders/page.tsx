/**
 * Сторінка списку замовлень адмін-панелі
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
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

  if (!admin) {
    redirect('/admin-path-57fyg/login');
  }

  if (!admin.permissions.includes('orders.read')) {
    redirect('/admin-path-57fyg');
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
