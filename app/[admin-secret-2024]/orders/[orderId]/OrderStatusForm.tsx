'use client';

/**
 * Компонент форми оновлення статусу замовлення
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentNotes: string;
}

const orderStatuses = [
  { value: 'processing', label: 'В обробці' },
  { value: 'confirmed', label: 'Підтверджено' },
  { value: 'shipped', label: 'Відправлено' },
  { value: 'delivered', label: 'Доставлено' },
  { value: 'cancelled', label: 'Скасовано' },
];

const paymentStatuses = [
  { value: 'pending', label: 'Очікує' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'failed', label: 'Помилка' },
  { value: 'refunded', label: 'Повернення' },
];

export default function OrderStatusForm({
  orderId,
  currentStatus,
  currentPaymentStatus,
  currentNotes,
}: OrderStatusFormProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [adminNotes, setAdminNotes] = useState(currentNotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const updates: Record<string, string> = {};

      if (orderStatus !== currentStatus) {
        updates.order_status = orderStatus;
      }
      if (paymentStatus !== currentPaymentStatus) {
        updates.payment_status = paymentStatus;
      }
      if (adminNotes !== currentNotes) {
        updates.admin_notes = adminNotes;
      }

      if (Object.keys(updates).length === 0) {
        setMessage('Немає змін для збереження');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const response = await fetch(`/admin-secret-2024/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Помилка оновлення замовлення');
        setMessageType('error');
        setLoading(false);
        return;
      }

      setMessage('Замовлення успішно оновлено');
      setMessageType('success');
      router.refresh();
    } catch (err) {
      setMessage('Виникла помилка. Спробуйте ще раз.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    fontSize: '14px',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold' as const,
    marginBottom: '5px',
    fontSize: '14px',
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <div style={{
          backgroundColor: messageType === 'success' ? '#e8f5e9' : '#ffebee',
          color: messageType === 'success' ? '#2e7d32' : '#c62828',
          padding: '10px',
          marginBottom: '15px',
          border: `1px solid ${messageType === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <label htmlFor="order_status" style={labelStyle}>Статус замовлення</label>
          <select
            id="order_status"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            style={selectStyle}
          >
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment_status" style={labelStyle}>Статус оплати</label>
          <select
            id="payment_status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            style={selectStyle}
          >
            {paymentStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="admin_notes" style={labelStyle}>Примітки адміністратора</label>
        <textarea
          id="admin_notes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 25px',
          backgroundColor: loading ? '#ccc' : '#4caf50',
          color: 'white',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
      >
        {loading ? 'Збереження...' : 'Зберегти зміни'}
      </button>
    </form>
  );
}
