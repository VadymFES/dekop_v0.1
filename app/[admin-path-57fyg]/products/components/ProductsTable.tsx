'use client';

/**
 * Products table with multi-select and bulk delete functionality
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

type SortColumn = 'category' | 'price' | 'stock' | 'is_on_sale' | 'updated_at';
type SortOrder = 'asc' | 'desc';

interface ProductsTableProps {
  products: Product[];
  canDelete: boolean;
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

// Get value for sorting - must be outside component for proper memoization
function getSortValue(product: Product, column: SortColumn): string | number {
  switch (column) {
    case 'category':
      return product.category;
    case 'price':
      return product.price;
    case 'stock':
      return product.stock;
    case 'is_on_sale':
      return (product.is_on_sale ? 4 : 0) + (product.is_new ? 2 : 0) + (product.is_bestseller ? 1 : 0);
    case 'updated_at':
      return new Date(product.updated_at).getTime();
    default:
      return 0;
  }
}

// Sort indicator component
function SortIndicator({ column, currentSort, currentOrder }: { column: SortColumn; currentSort: SortColumn | null; currentOrder: SortOrder }) {
  if (currentSort !== column) {
    return <span className={styles.sortIndicator}>↕</span>;
  }
  return <span className={styles.sortIndicatorActive}>{currentOrder === 'asc' ? '↑' : '↓'}</span>;
}

export default function ProductsTable({
  products,
  canDelete,
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Read sort state from URL params
  const validSortColumns: SortColumn[] = ['category', 'price', 'stock', 'is_on_sale', 'updated_at'];
  const sortParam = searchParams.get('sort');
  const [sortCol, sortOrd] = sortParam?.split(':') || [];
  const sortColumn: SortColumn | null = validSortColumns.includes(sortCol as SortColumn) ? sortCol as SortColumn : null;
  const sortOrder: SortOrder = sortOrd === 'asc' ? 'asc' : 'desc';

  // Handle sort click: cycle desc -> asc -> remove
  const handleSort = useCallback((column: SortColumn) => {
    const params = new URLSearchParams(searchParams.toString());

    if (sortColumn === column) {
      if (sortOrder === 'desc') {
        params.set('sort', `${column}:asc`);
      } else {
        params.delete('sort');
      }
    } else {
      params.set('sort', `${column}:desc`);
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, sortColumn, sortOrder, router]);

  // Sort products client-side
  const sortedProducts = useMemo(() => {
    if (!sortColumn) return products;

    return [...products].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortColumn, sortOrder]);

  const allSelected = sortedProducts.length > 0 && selectedIds.size === sortedProducts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedProducts.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProducts.map(p => p.id)));
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
                <button
                  onClick={() => handleSort('category')}
                  className={sortColumn === 'category' ? styles.sortableHeaderActive : styles.sortableHeader}
                >
                  Категорія
                  <SortIndicator column="category" currentSort={sortColumn} currentOrder={sortOrder} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  onClick={() => handleSort('price')}
                  className={sortColumn === 'price' ? styles.sortableHeaderActive : styles.sortableHeader}
                >
                  Ціна
                  <SortIndicator column="price" currentSort={sortColumn} currentOrder={sortOrder} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  onClick={() => handleSort('stock')}
                  className={sortColumn === 'stock' ? styles.sortableHeaderActive : styles.sortableHeader}
                >
                  Запас
                  <SortIndicator column="stock" currentSort={sortColumn} currentOrder={sortOrder} />
                </button>
              </th>
              <th className={styles.th}>
                <button
                  onClick={() => handleSort('is_on_sale')}
                  className={sortColumn === 'is_on_sale' ? styles.sortableHeaderActive : styles.sortableHeader}
                >
                  Мітки
                  <SortIndicator column="is_on_sale" currentSort={sortColumn} currentOrder={sortOrder} />
                </button>
              </th>
              <th className={styles.th}>Створено</th>
              <th className={styles.th}>
                <button
                  onClick={() => handleSort('updated_at')}
                  className={sortColumn === 'updated_at' ? styles.sortableHeaderActive : styles.sortableHeader}
                >
                  Змінено
                  <SortIndicator column="updated_at" currentSort={sortColumn} currentOrder={sortOrder} />
                </button>
              </th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => (
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
            {sortedProducts.length === 0 && (
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
