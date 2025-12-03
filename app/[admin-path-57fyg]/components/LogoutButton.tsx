'use client';

/**
 * Кнопка виходу з системи
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/admin-path-57fyg/api/auth/logout', {
        method: 'POST',
      });
      // Clear session timer
      localStorage.removeItem('admin_session_start');
      router.push('/admin-path-57fyg/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: 'transparent',
        color: '#aaa',
        border: '1px solid #555',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
      }}
    >
      {loading ? 'Вихід...' : 'Вийти'}
    </button>
  );
}
