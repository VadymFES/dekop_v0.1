'use client';

/**
 * Форма входу в адмін-панель
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../styles/admin.module.css';

// Get admin path from environment variable (Task 7)
const ADMIN_PATH = `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin'}`;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${ADMIN_PATH}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        // Translate common errors to Ukrainian
        const errorMessages: Record<string, string> = {
          'Invalid email or password': 'Невірний email або пароль',
          'Account is locked. Please try again later.': 'Акаунт заблоковано. Спробуйте пізніше.',
          'Account is inactive': 'Акаунт неактивний',
        };
        setError(errorMessages[data.error] || data.error || 'Помилка входу');
        setLoading(false);
        return;
      }

      // Store login timestamp for session timer
      localStorage.setItem('admin_session_start', Date.now().toString());

      // Redirect to dashboard on success
      router.push(ADMIN_PATH);
      router.refresh();
    } catch (err) {
      setError('Виникла помилка. Спробуйте ще раз.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div>
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

      <div className={styles.mt15}>
        <label htmlFor="password" className={styles.label}>Пароль</label>
        <div className={styles.passwordInputWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={styles.input}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.passwordToggle}
            aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`${styles.buttonPrimary} ${styles.buttonFullWidth} ${styles.mt20}`}
      >
        {loading ? 'Вхід...' : 'Увійти'}
      </button>

      <div className={`${styles.mt20} ${styles.textCenter}`}>
        <Link
          href={`${ADMIN_PATH}/reset-password`}
          className={styles.loginForgotLink}
        >
          Забули пароль?
        </Link>
      </div>
    </form>
  );
}
