/**
 * Сторінка скидання пароля
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Скидання пароля',
  robots: 'noindex, nofollow',
};

export default async function ResetPasswordPage() {
  // Якщо вже авторизований - перенаправити на головну
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect('/admin-path-57fyg');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        border: '1px solid #ccc',
        width: '400px',
      }}>
        <h1 style={{
          fontSize: '24px',
          marginBottom: '10px',
          textAlign: 'center',
          color: '#333',
        }}>
          Скидання пароля
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          Введіть email для отримання посилання на скидання пароля
        </p>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
