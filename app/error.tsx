'use client';

import { useEffect } from 'react';
import styles from './error.module.css';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    fetch('/api/internal/track-error', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <main className={styles.page}>
      <p className={styles.code}>500</p>
      <h1 className={styles.title}>Щось пішло не так</h1>
      <p className={styles.body}>
        Сталася непередбачена помилка. Спробуйте ще раз або поверніться на головну.
      </p>
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={reset}>Спробувати знову</button>
        <a href="/" className={styles.btnSecondary}>На головну</a>
      </div>
    </main>
  );
}
