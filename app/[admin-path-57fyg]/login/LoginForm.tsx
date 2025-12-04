'use client';

/**
 * Форма входу в адмін-панель
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../styles/admin.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/admin-path-57fyg/api/auth/login', {
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
      router.push('/admin-path-57fyg');
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
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={styles.input}
        />
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
          href="/admin-path-57fyg/reset-password"
          className={styles.loginForgotLink}
        >
          Забули пароль?
        </Link>
      </div>
    </form>
  );
}
