/**
 * Сторінка входу в адмін-панель
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Вхід в адмін-панель',
  robots: 'noindex, nofollow',
};

export default async function AdminLoginPage() {
  // Якщо вже авторизований - перенаправити на головну
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect('/admin-secret-2024');
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
          marginBottom: '30px',
          textAlign: 'center',
          color: '#333',
        }}>
          Вхід в адмін-панель
        </h1>

        <LoginForm />
      </div>
    </div>
  );
}
