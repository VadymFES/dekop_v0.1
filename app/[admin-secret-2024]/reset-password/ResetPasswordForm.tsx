'use client';

/**
 * Форма скидання пароля
 */

import { useState } from 'react';
import Link from 'next/link';

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
      const response = await fetch('/admin-secret-2024/api/auth/reset-password', {
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
          textAlign: 'center',
        }}>
          Якщо email існує в системі, на нього буде відправлено посилання для скидання пароля.
        </div>
        <Link
          href="/admin-secret-2024/login"
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

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    marginBottom: '15px',
    border: '1px solid #ccc',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold' as const,
    color: '#333',
    fontSize: '14px',
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px',
          marginBottom: '20px',
          border: '1px solid #ef9a9a',
        }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: loading ? '#ccc' : '#333',
          color: 'white',
          border: 'none',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '10px',
        }}
      >
        {loading ? 'Відправка...' : 'Скинути пароль'}
      </button>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link
          href="/admin-secret-2024/login"
          style={{ color: '#1976d2', fontSize: '14px' }}
        >
          Повернутися до входу
        </Link>
      </div>
    </form>
  );
}
