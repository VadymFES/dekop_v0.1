'use client';

/**
 * Компонент форми оновлення статусу замовлення
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/admin.module.css';

interface AdminNote {
  text: string;
  author: string;
  timestamp: string;
}

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentNotes: string; // JSON string or plain text
  adminEmail: string;
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

// Parse notes - handle both old format (plain text) and new format (JSON array)
function parseNotes(notesString: string): AdminNote[] {
  if (!notesString) return [];

  try {
    const parsed = JSON.parse(notesString);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's not an array, it might be old format
    return [];
  } catch {
    // Old format: plain text - convert to new format with unknown author
    if (notesString.trim()) {
      return [{
        text: notesString,
        author: 'Невідомо',
        timestamp: new Date().toISOString()
      }];
    }
    return [];
  }
}

function formatNoteDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderStatusForm({
  orderId,
  currentStatus,
  currentPaymentStatus,
  currentNotes,
  adminEmail,
}: OrderStatusFormProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [existingNotes] = useState<AdminNote[]>(parseNotes(currentNotes));
  const [newNote, setNewNote] = useState('');
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

      // If there's a new note, add it to the existing notes
      if (newNote.trim()) {
        const allNotes: AdminNote[] = [
          ...existingNotes,
          {
            text: newNote.trim(),
            author: adminEmail,
            timestamp: new Date().toISOString()
          }
        ];
        updates.admin_notes = JSON.stringify(allNotes);
      }

      if (Object.keys(updates).length === 0) {
        setMessage('Немає змін для збереження');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const response = await fetch(`/admin-path-57fyg/api/orders/${orderId}`, {
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
      setNewNote(''); // Clear the new note field
      router.refresh();
    } catch (err) {
      setMessage('Виникла помилка. Спробуйте ще раз.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
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
          borderRadius: '4px',
        }}>
          {message}
        </div>
      )}

      <div className={styles.grid2} style={{ marginBottom: '15px' }}>
        <div>
          <label htmlFor="order_status" className={styles.label}>Статус замовлення</label>
          <select
            id="order_status"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            className={styles.select}
          >
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment_status" className={styles.label}>Статус оплати</label>
          <select
            id="payment_status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className={styles.select}
          >
            {paymentStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label className={styles.label}>Примітки адміністратора</label>

        {/* Display existing notes */}
        {existingNotes.length > 0 && (
          <div style={{
            marginBottom: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#fafafa'
          }}>
            {existingNotes.map((note, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 12px',
                  borderBottom: index < existingNotes.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <span style={{ fontWeight: '500' }}>{note.author}</span>
                  <span>{formatNoteDate(note.timestamp)}</span>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New note input */}
        <textarea
          id="admin_notes"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          placeholder="Додати нову примітку..."
          className={styles.textarea}
          style={{ minHeight: '80px' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={styles.buttonPrimary}
      >
        {loading ? 'Збереження...' : 'Зберегти зміни'}
      </button>
    </form>
  );
}
