'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCsrf } from './CsrfProvider';
import { useAdminPath } from './AdminPathProvider';
import styles from '../styles/admin.module.css';

export default function LogoutButton() {
  const router = useRouter();
  const { csrfFetch } = useCsrf();
  const adminPath = useAdminPath();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Use CSRF-protected fetch (Task 6)
      await csrfFetch(`${adminPath}/api/auth/logout`, {
        method: 'POST',
      });
      // Clear session timer
      localStorage.removeItem('admin_session_start');
      router.push(`${adminPath}/login`);
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
