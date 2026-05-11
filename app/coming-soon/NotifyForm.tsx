'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscribeNotification } from './actions';
import styles from './page.module.css';

function SuccessBox() {
  return (
    <div className={styles.successBox}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F45145" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Дякуємо! Ми сповістимо вас про відкриття.</span>
    </div>
  );
}

export default function NotifyForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(subscribeNotification, null);

  if (searchParams.get('subscribed') === '1') {
    return <SuccessBox />;
  }

  return (
    <>
      <form className={styles.form} action={action}>
        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="Ваш email"
          aria-label="Email для сповіщення"
          required
          disabled={pending}
        />
        <button className={styles.btn} type="submit" disabled={pending}>
          {pending ? '...' : 'Сповістити'}
        </button>
      </form>
      {state?.error && <p className={styles.formError}>{state.error}</p>}
      {!state?.error && <p className={styles.formNote}>Без спаму. Тільки важливе.</p>}
    </>
  );
}
