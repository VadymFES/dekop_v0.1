'use client';

/**
 * Кнопка виходу з системи
 * Uses CSRF protection for logout request (Task 6)
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCsrf } from './CsrfProvider';
import styles from '../styles/admin.module.css';

// Get admin path from environment variable (Task 7)
const ADMIN_PATH = `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin'}`;

export default function LogoutButton() {
  const router = useRouter();
  const { csrfFetch } = useCsrf();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Use CSRF-protected fetch (Task 6)
      await csrfFetch(`${ADMIN_PATH}/api/auth/logout`, {
        method: 'POST',
      });
      // Clear session timer
      localStorage.removeItem('admin_session_start');
      router.push(`${ADMIN_PATH}/login`);
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
