/**
 * Admin Login Page
 * Simple form for admin authentication
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Admin Login',
  robots: 'noindex, nofollow',
};

export default async function AdminLoginPage() {
  // If already logged in, redirect to dashboard
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
          Admin Login
        </h1>

        <LoginForm />
      </div>
    </div>
  );
}
