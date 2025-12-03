'use client';

/**
 * Форма скидання пароля
 */

import { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/admin.module.css';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/admin-path-57fyg/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Помилка скидання пароля');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Виникла помилка. Спробуйте ще раз.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '15px',
          marginBottom: '20px',
          border: '1px solid #a5d6a7',
          borderRadius: '4px',
          textAlign: 'center',
        }}>
          Якщо email існує в системі, на нього буде відправлено посилання для скидання пароля.
        </div>
        <Link
          href="/admin-path-57fyg/login"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#1976d2',
            fontSize: '14px',
          }}
        >
          Повернутися до входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={styles.input}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={styles.buttonPrimary}
        style={{
          width: '100%',
          backgroundColor: loading ? '#ccc' : '#333',
        }}
      >
        {loading ? 'Відправка...' : 'Скинути пароль'}
      </button>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link
          href="/admin-path-57fyg/login"
          style={{ color: '#1976d2', fontSize: '14px' }}
        >
          Повернутися до входу
        </Link>
      </div>
    </form>
  );
}
