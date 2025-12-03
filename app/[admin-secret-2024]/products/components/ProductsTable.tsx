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
}

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
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductsTable({
  products,
  canDelete,
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
      const response = await fetch('/admin-secret-2024/api/products/bulk-delete', {
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
      const response = await fetch(`/admin-secret-2024/api/products/${id}`, {
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
        <div style={{
          backgroundColor: '#fff3e0',
          border: '1px solid #ffcc80',
          borderRadius: '4px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '14px', color: '#e65100' }}>
            Вибрано: <strong>{selectedIds.size}</strong> {getItemWord(selectedIds.size)}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={styles.buttonSecondary}
              style={{ padding: '8px 16px' }}
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
        <div className={styles.error} style={{ marginBottom: '16px' }}>
          {deleteError}
        </div>
      )}

      {/* Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              {canDelete && (
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </th>
              )}
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Назва</th>
              <th style={thStyle}>Категорія</th>
              <th style={thStyle}>Ціна</th>
              <th style={thStyle}>Запас</th>
              <th style={thStyle}>Мітки</th>
              <th style={thStyle}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                style={{
                  backgroundColor: selectedIds.has(product.id) ? '#e3f2fd' : 'transparent',
                }}
              >
                {canDelete && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => handleSelectOne(product.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                )}
                <td style={tdStyle}>{product.id}</td>
                <td style={tdStyle}>
                  <div>{product.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{product.slug}</div>
                </td>
                <td style={tdStyle}>{formatCategory(product.category)}</td>
                <td style={tdStyle}>{formatCurrency(product.price)}</td>
                <td style={{
                  ...tdStyle,
                  color: product.stock === 0 ? '#f44336' : product.stock < 10 ? '#ff9800' : '#333',
                  fontWeight: product.stock < 10 ? 'bold' : 'normal',
                }}>
                  {product.stock}
                </td>
                <td style={tdStyle}>
                  {product.is_on_sale && <span style={{ color: '#f44336', marginRight: '5px' }}>АКЦІЯ</span>}
                  {product.is_new && <span style={{ color: '#4caf50', marginRight: '5px' }}>НОВИНКА</span>}
                  {product.is_bestseller && <span style={{ color: '#ff9800' }}>ХІТ</span>}
                </td>
                <td style={tdStyle}>
                  <Link
                    href={`/admin-secret-2024/products/${product.id}/edit`}
                    style={{ color: '#1976d2', marginRight: '10px' }}
                  >
                    Редагувати
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => handleSingleDelete(product.id, product.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f44336',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: 0,
                      }}
                    >
                      Видалити
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 8 : 7} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
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
