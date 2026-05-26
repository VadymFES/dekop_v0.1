'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfTokenFromCookie } from '../../components/CsrfProvider';

interface Props {
  productId: number;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  adminPath: string;
}

export default function StockAdjustmentForm({
  productId,
  currentStock,
  reorderLevel,
  reorderQty,
  adminPath,
}: Props) {
  const router = useRouter();
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [rlValue, setRlValue] = useState(String(reorderLevel));
  const [rqValue, setRqValue] = useState(String(reorderQty));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const quantity = parseInt(qty, 10);
    if (isNaN(quantity) || quantity === 0) {
      setError('Введіть ненульову кількість');
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = getCsrfTokenFromCookie();
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch(`${adminPath}/api/inventory/adjust`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId, quantity, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Помилка');
      }
      setSuccess('Залишок оновлено');
      setQty('');
      setNotes('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }

  async function handleReorderUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = getCsrfTokenFromCookie();
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch(`${adminPath}/api/products/${productId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          reorder_level: parseInt(rlValue, 10) || 0,
          reorder_qty: parseInt(rqValue, 10) || 0,
        }),
      });
      if (!res.ok) throw new Error('Помилка збереження');
      setSuccess('Рівні збережено');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Коригування залишку</h3>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Поточний залишок: <strong>{currentStock}</strong>
        </p>
        <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>
              Зміна (+/-)*
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="напр. +10 або -3"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>Причина</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Причина коригування..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Збереження...' : 'Застосувати'}
          </button>
        </form>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Рівні поповнення</h3>
        <form onSubmit={handleReorderUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>
              Мінімальний залишок
            </label>
            <input
              type="number"
              min={0}
              value={rlValue}
              onChange={(e) => setRlValue(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>
              Рекомендоване поповнення
            </label>
            <input
              type="number"
              min={0}
              value={rqValue}
              onChange={(e) => setRqValue(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Збереження...' : 'Зберегти'}
          </button>
        </form>
      </div>

      {(error || success) && (
        <div style={{ gridColumn: '1 / -1' }}>
          {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', margin: 0 }}>{success}</p>}
        </div>
      )}
    </div>
  );
}
