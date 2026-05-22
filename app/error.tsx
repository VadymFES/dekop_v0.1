'use client';

import { useEffect } from 'react';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    fetch('/api/internal/track-error', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif',
      background: '#faf9f7',
      color: '#160101',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <p style={{ fontSize: '5rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>500</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>
        Щось пішло не так
      </h1>
      <p style={{ color: '#888', margin: '0 0 2rem', maxWidth: 360 }}>
        Сталася непередбачена помилка. Спробуйте ще раз або поверніться на головну.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.7rem 2rem',
            background: '#160101',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.95rem',
          }}
        >
          Спробувати знову
        </button>
        <a href="/" style={{
          padding: '0.7rem 2rem',
          border: '1.5px solid #160101',
          color: '#160101',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 500,
          fontSize: '0.95rem',
        }}>
          На головну
        </a>
      </div>
    </main>
  );
}
