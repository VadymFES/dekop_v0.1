/**
 * Сторінка списку клієнтів адмін-панелі (CRM)
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import { getAdminUrl } from '@/app/lib/admin-path';
import { VIP_SPEND_THRESHOLD } from '@/app/lib/crm/segments';
import CustomersTable from './components/CustomersTable';
import styles from '../styles/admin.module.css';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    segment?: string;
    customer_type?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) {
    redirect(`${adminPath}/login`);
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const segment = params.segment || '';
  const customerType = params.customer_type || '';
  const limit = 20;
  const offset = (page - 1) * limit;

  const { customers, total } = await getCustomers({ limit, offset, search, segment, customerType });
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Клієнти ({total})</h1>
      </div>

      {/* Фільтри */}
      <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
        <form method="GET" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className={styles.labelSmall}>Пошук</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Ім'я, телефон, email, компанія..."
              className={styles.inputSmall}
              style={{ width: '220px' }}
            />
          </div>

          <div>
            <label className={styles.labelSmall}>Сегмент</label>
            <select name="segment" defaultValue={segment} className={styles.select} style={{ width: '150px', padding: '10px 12px' }}>
              <option value="">Всі</option>
              <option value="new">Нові</option>
              <option value="repeat">Повторні</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div>
            <label className={styles.labelSmall}>Тип</label>
            <select name="customer_type" defaultValue={customerType} className={styles.select} style={{ width: '140px', padding: '10px 12px' }}>
              <option value="">Всі</option>
              <option value="individual">Фізична особа</option>
              <option value="business">Бізнес</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>
            Фільтрувати
          </button>

          <Link href={getAdminUrl('customers')} style={{ padding: '8px 20px', backgroundColor: '#f5f5f5', color: '#333', textDecoration: 'none', border: '1px solid #ccc' }}>
            Очистити
          </Link>
        </form>
      </div>

      <CustomersTable customers={customers} vipThreshold={VIP_SPEND_THRESHOLD} />

      {/* Пагінація */}
      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {page > 1 && (
            <Link href={buildPageUrl(page - 1, { search, segment, customer_type: customerType })} style={paginationLinkStyle}>
              Попередня
            </Link>
          )}
          <span style={{ padding: '8px 15px' }}>Сторінка {page} з {totalPages}</span>
          {page < totalPages && (
            <Link href={buildPageUrl(page + 1, { search, segment, customer_type: customerType })} style={paginationLinkStyle}>
              Наступна
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

async function getCustomers({
  limit, offset, search, segment, customerType,
}: {
  limit: number; offset: number; search: string; segment: string; customerType: string;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`(first_name ILIKE $${i} OR last_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i} OR company_name ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }
  if (customerType) {
    conditions.push(`customer_type = $${i++}`);
    params.push(customerType);
  }
  if (segment === 'vip') {
    conditions.push(`total_spent >= $${i++}`);
    params.push(VIP_SPEND_THRESHOLD);
  } else if (segment === 'repeat') {
    conditions.push(`total_orders >= 2`);
  } else if (segment === 'new') {
    conditions.push(`total_orders <= 1`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(`SELECT COUNT(*) AS total FROM customers ${whereClause}`, params);
  const listResult = await db.query(
    `SELECT id, phone, email, first_name, last_name, customer_type, company_name,
            tags, total_orders, total_spent, last_order_at, created_at
     FROM customers
     ${whereClause}
     ORDER BY last_order_at DESC NULLS LAST
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset],
  );

  return {
    customers: listResult.rows,
    total: Number(countResult.rows[0]?.total) || 0,
  };
}

function buildPageUrl(page: number, params: Record<string, string>) {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  return `${getAdminUrl('customers')}?${sp.toString()}`;
}

const paginationLinkStyle = {
  padding: '8px 15px',
  backgroundColor: '#333',
  color: 'white',
  textDecoration: 'none',
};
