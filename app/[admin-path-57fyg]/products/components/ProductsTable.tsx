'use client';

/**
 * Products table with multi-select and bulk delete functionality
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import styles from '../../styles/admin.module.css';

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsTableProps {
  products: Product[];
  canDelete: boolean;
  currentSort: string;
  currentOrder: string;
  searchParams: { search: string; category: string; low_stock: string };
}

function formatCategory(category: string): string {
  const categories: Record<string, string> = {
    sofas: 'Дивани',
    corner_sofas: 'Кутові дивани',
    sofa_beds: 'Дивани-ліжка',
    beds: 'Ліжка',
    tables: 'Столи',
    chairs: 'Стільці',
    mattresses: 'Матраци',
    wardrobes: 'Шафи',
    accessories: 'Аксесуари',
  };
  return categories[category] || category;
}

function formatCurrency(amount: number): string {
  // Use a fixed format to avoid hydration mismatch between server/client
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} грн`;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStockClass(stock: number): string {
  if (stock === 0) return styles.stockOut;
  if (stock < 10) return styles.stockLow;
  return styles.stockNormal;
}

// Sort indicator component
function SortIndicator({ column, currentSort, currentOrder }: { column: string; currentSort: string; currentOrder: string }) {
  if (currentSort !== column) {
    return <span className={styles.sortIndicator}>⇅</span>;
  }
  return <span className={styles.sortIndicatorActive}>{currentOrder === 'asc' ? '▲' : '▼'}</span>;
}

// Build sort URL helper
// Click cycle: 1st click = desc, 2nd click = asc, 3rd click = reset to default
function buildSortUrl(column: string, currentSort: string, currentOrder: string, searchParams: { search: string; category: string; low_stock: string }) {
  const params = new URLSearchParams();
  if (searchParams.search) params.set('search', searchParams.search);
  if (searchParams.category) params.set('category', searchParams.category);
  if (searchParams.low_stock) params.set('low_stock', searchParams.low_stock);

  if (currentSort === column) {
    if (currentOrder === 'desc') {
      // Second click: switch to ascending
      params.set('sort', column);
      params.set('order', 'asc');
    }
    // Third click (asc): reset to default - don't set sort/order params
    // This will use the default created_at desc
  } else {
    // First click on new column: sort descending
    params.set('sort', column);
    params.set('order', 'desc');
  }

  return `/admin-path-57fyg/products${params.toString() ? '?' + params.toString() : ''}`;
}

// Sortable header component
function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  searchParams
}: {
  column: string;
  label: string;
  currentSort: string;
  currentOrder: string;
  searchParams: { search: string; category: string; low_stock: string };
}) {
  const isActive = currentSort === column;
  return (
    <Link
      href={buildSortUrl(column, currentSort, currentOrder, searchParams)}
      className={isActive ? styles.sortableHeaderActive : styles.sortableHeader}
    >
      {label}
      <SortIndicator column={column} currentSort={currentSort} currentOrder={currentOrder} />
    </Link>
  );
}

export default function ProductsTable({
  products,
  canDelete,
  currentSort,
  currentOrder,
  searchParams,
}: ProductsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/admin-path-57fyg/api/products/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Помилка видалення');
      }

      setSelectedIds(new Set());
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Помилка видалення');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (id: number, name: string) => {
    if (!confirm(`Видалити товар "${name}"?`)) return;

    try {
      const response = await fetch(`/admin-path-57fyg/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Помилка видалення');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Помилка видалення');
    }
  };

  return (
    <>
      {/* Bulk actions bar */}
      {canDelete && selectedIds.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.bulkActionsText}>
            Вибрано: <strong>{selectedIds.size}</strong> {getItemWord(selectedIds.size)}
          </span>
          <div className={styles.bulkActionsButtons}>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={styles.buttonSecondary}
            >
              Скасувати вибір
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={styles.buttonDanger}
            >
              Видалити вибрані
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <div className={`${styles.error} ${styles.mb15}`}>
          {deleteError}
        </div>
      )}

      {/* Table */}
      <div className={styles.cardNoPadding}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              {canDelete && (
                <th className={styles.thCenter}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className={styles.checkbox}
                  />
                </th>
              )}
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Назва</th>
              <th className={styles.th}>
                <SortableHeader column="category" label="Категорія" currentSort={currentSort} currentOrder={currentOrder} searchParams={searchParams} />
              </th>
              <th className={styles.th}>
                <SortableHeader column="price" label="Ціна" currentSort={currentSort} currentOrder={currentOrder} searchParams={searchParams} />
              </th>
              <th className={styles.th}>
                <SortableHeader column="stock" label="Запас" currentSort={currentSort} currentOrder={currentOrder} searchParams={searchParams} />
              </th>
              <th className={styles.th}>
                <SortableHeader column="is_on_sale" label="Мітки" currentSort={currentSort} currentOrder={currentOrder} searchParams={searchParams} />
              </th>
              <th className={styles.th}>Створено</th>
              <th className={styles.th}>
                <SortableHeader column="updated_at" label="Змінено" currentSort={currentSort} currentOrder={currentOrder} searchParams={searchParams} />
              </th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className={selectedIds.has(product.id) ? styles.rowSelected : ''}
              >
                {canDelete && (
                  <td className={styles.tdCenter}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => handleSelectOne(product.id)}
                      className={styles.checkbox}
                    />
                  </td>
                )}
                <td className={styles.td}>{product.id}</td>
                <td className={styles.td}>
                  <div>{product.name}</div>
                  <div className={styles.slugText}>{product.slug}</div>
                </td>
                <td className={styles.td}>{formatCategory(product.category)}</td>
                <td className={styles.td}>{formatCurrency(product.price)}</td>
                <td className={`${styles.td} ${getStockClass(product.stock)}`}>
                  {product.stock}
                </td>
                <td className={styles.td}>
                  {product.is_on_sale && <span className={styles.badgeSale}>АКЦІЯ</span>}
                  {product.is_new && <span className={styles.badgeNew}>НОВИНКА</span>}
                  {product.is_bestseller && <span className={styles.badgeBestseller}>ХІТ</span>}
                </td>
                <td className={styles.tdSmall}>
                  {formatDate(product.created_at)}
                </td>
                <td className={styles.tdSmall}>
                  {formatDate(product.updated_at)}
                </td>
                <td className={styles.td}>
                  <Link
                    href={`/admin-path-57fyg/products/${product.id}/edit`}
                    className={`${styles.link} ${styles.mr10}`}
                  >
                    Редагувати
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => handleSingleDelete(product.id, product.name)}
                      className={styles.linkDanger}
                    >
                      Видалити
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 10 : 9} className={styles.tdEmpty}>
                  Товарів не знайдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        title="Видалити вибрані товари?"
        message="Ця дія незворотна. Всі вибрані товари будуть видалені з бази даних."
        itemCount={selectedIds.size}
        confirmText="Видалити"
        cancelText="Скасувати"
        variant="danger"
        onConfirm={handleDeleteSelected}
        onCancel={() => setIsModalOpen(false)}
        isLoading={isDeleting}
      />
    </>
  );
}

function getItemWord(count: number): string {
  if (count === 1) return 'товар';
  if (count >= 2 && count <= 4) return 'товари';
  return 'товарів';
}
