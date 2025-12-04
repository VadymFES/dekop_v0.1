/**
 * Сторінка входу в адмін-панель
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import LoginForm from './LoginForm';
import styles from '../styles/admin.module.css';

export const metadata = {
  title: 'Вхід в адмін-панель',
  robots: 'noindex, nofollow',
};

export default async function AdminLoginPage() {
  // Якщо вже авторизований - перенаправити на головну
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect('/admin-path-57fyg');
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>
          Вхід в адмін-панель
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
