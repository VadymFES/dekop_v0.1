'use client';

/**
 * Orders table with multi-select and bulk delete functionality
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import styles from '../../styles/admin.module.css';

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

interface OrdersTableProps {
  orders: Order[];
  canDelete: boolean;
}

export default function OrdersTable({
  orders,
  canDelete,
}: OrdersTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < orders.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const handleSelectOne = (id: string) => {
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
      const response = await fetch('/admin-secret-2024/api/orders/bulk-delete', {
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
            {orders.map((order) => (
              <tr
                key={order.id}
                style={{
                  backgroundColor: selectedIds.has(order.id) ? '#e3f2fd' : 'transparent',
                }}
              >
                {canDelete && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => handleSelectOne(order.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                )}
                <td style={tdStyle}>
                  <Link href={`/admin-secret-2024/orders/${order.id}`} style={{ color: '#1976d2', fontWeight: 'bold' }}>
                    #{order.order_number}
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
                <td colSpan={canDelete ? 9 : 8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  Замовлення не знайдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        title="Видалити вибрані замовлення?"
        message="Ця дія незворотна. Всі вибрані замовлення та їх деталі будуть видалені з бази даних."
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
  if (count === 1) return 'замовлення';
  if (count >= 2 && count <= 4) return 'замовлення';
  return 'замовлень';
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    processing: 'В обробці',
    confirmed: 'Підтверджено',
    shipped: 'Відправлено',
    delivered: 'Доставлено',
    cancelled: 'Скасовано',
  };
  const colors: Record<string, { bg: string; text: string }> = {
    processing: { bg: '#fff3e0', text: '#e65100' },
    confirmed: { bg: '#e3f2fd', text: '#1565c0' },
    shipped: { bg: '#f3e5f5', text: '#7b1fa2' },
    delivered: { bg: '#e8f5e9', text: '#2e7d32' },
    cancelled: { bg: '#ffebee', text: '#c62828' },
  };
  const color = colors[status] || { bg: '#f5f5f5', text: '#333' };
  return (
    <span style={{
      backgroundColor: color.bg,
      color: color.text,
      padding: '4px 10px',
      fontWeight: 'bold',
      fontSize: '12px',
      borderRadius: '3px',
    }}>
      {labels[status] || status}
    </span>
  );
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
  return <span style={{ color: colors[status] || '#333', fontWeight: 'bold', fontSize: '13px' }}>{labels[status] || status}</span>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('uk-UA', {
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
