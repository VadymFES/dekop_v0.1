import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { sql } from '@vercel/postgres';
import { getAdminUrl } from '@/app/lib/admin-path';
import InventoryTable from './components/InventoryTable';
import styles from '../styles/admin.module.css';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    filter?: string;
    category?: string;
  }>;
}

async function getInventory(params: {
  page: number;
  search?: string;
  filter?: string;
  category?: string;
}) {
  const { page, search, filter, category } = params;
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let n = 1;

  if (filter === 'low') {
    conditions.push(`p.reorder_level > 0 AND p.stock <= p.reorder_level AND p.stock > 0`);
  } else if (filter === 'out') {
    conditions.push(`p.stock <= 0`);
  }
  if (category) {
    conditions.push(`p.category = $${n++}`);
    queryParams.push(category);
  }
  if (search) {
    conditions.push(`p.name ILIKE $${n++}`);
    queryParams.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    sql.query(`SELECT COUNT(*) FROM products p ${where}`, queryParams),
    sql.query(
      `SELECT p.id, p.name, p.slug, p.category, p.stock, p.reorder_level, p.reorder_qty
       FROM products p ${where}
       ORDER BY p.stock ASC, p.name ASC
       LIMIT $${n++} OFFSET $${n++}`,
      [...queryParams, limit, offset],
    ),
  ]);

  return {
    products: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    page,
    limit,
  };
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const admin = await getCurrentAdmin();
  const adminPath = getAdminUrl();

  if (!admin) redirect(`${adminPath}/login`);

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const { products, total, limit } = await getInventory({
    page,
    search: sp.search,
    filter: sp.filter,
    category: sp.category,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Склад</h1>
      </div>

      <form method="GET" className={styles.filterForm}>
        <input
          type="text"
          name="search"
          placeholder="Пошук товару..."
          defaultValue={sp.search ?? ''}
          className={styles.searchInput}
        />
        <select name="filter" defaultValue={sp.filter ?? ''} className={styles.filterSelect}>
          <option value="">Всі товари</option>
          <option value="low">Мало на складі</option>
          <option value="out">Немає на складі</option>
        </select>
        <button type="submit" className={styles.filterButton}>Фільтрувати</button>
        {(sp.search || sp.filter || sp.category) && (
          <Link href={`${adminPath}/inventory`} className={styles.clearButton}>Скинути</Link>
        )}
      </form>

      <InventoryTable products={products} adminPath={adminPath} />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && (
            <Link
              href={`${adminPath}/inventory?page=${page - 1}${sp.search ? `&search=${sp.search}` : ''}${sp.filter ? `&filter=${sp.filter}` : ''}`}
              className={styles.paginationButton}
            >
              Назад
            </Link>
          )}
          <span className={styles.paginationInfo}>{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`${adminPath}/inventory?page=${page + 1}${sp.search ? `&search=${sp.search}` : ''}${sp.filter ? `&filter=${sp.filter}` : ''}`}
              className={styles.paginationButton}
            >
              Далі
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
