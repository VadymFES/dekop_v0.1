'use client';

/**
 * Кнопка виходу з системи
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '../styles/admin.module.css';

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
      className={styles.logoutButton}
    >
      {loading ? 'Вихід...' : 'Вийти'}
    </button>
  );
}
