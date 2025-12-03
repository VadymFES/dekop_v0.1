'use client';

/**
 * Session Timer Component
 * Monitors admin session and auto-logs out after 12 hours
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export default function SessionTimer() {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const performLogout = useCallback(async () => {
    try {
      await fetch('/admin-path-57fyg/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Auto-logout error:', error);
    }
    localStorage.removeItem('admin_session_start');
    router.push('/admin-path-57fyg/login');
    router.refresh();
  }, [router]);

  useEffect(() => {
    // Initialize session start time if not exists
    const sessionStart = localStorage.getItem('admin_session_start');
    if (!sessionStart) {
      // If no session start time, set it now (for existing sessions)
      localStorage.setItem('admin_session_start', Date.now().toString());
    }

    const checkSession = () => {
      const startTime = localStorage.getItem('admin_session_start');
      if (!startTime) {
        // No session, log out
        performLogout();
        return;
      }

      const elapsed = Date.now() - parseInt(startTime, 10);
      const remaining = SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        // Session expired, log out
        performLogout();
        return;
      }

      // Update remaining time display
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      setTimeRemaining(`${hours}г ${minutes}хв`);
    };

    // Check immediately
    checkSession();

    // Set up interval to check periodically
    const interval = setInterval(checkSession, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [performLogout]);

  // Show remaining session time in the sidebar
  return (
    <div style={{
      fontSize: '11px',
      color: '#888',
      marginTop: '10px',
      textAlign: 'center',
    }}>
      Сесія: {timeRemaining}
    </div>
  );
}
