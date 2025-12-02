/**
 * Admin Panel Layout
 * Provides navigation and authentication check for all admin pages
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin, AdminUserWithPermissions } from '@/app/lib/admin-auth';
import AdminNav from './components/AdminNav';

export const metadata = {
  title: 'Admin Panel - DEKOP',
  robots: 'noindex, nofollow',
};

interface LayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: LayoutProps) {
  // Check authentication (except for login page)
  const admin = await getCurrentAdmin();

  return (
    <html lang="uk">
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
        color: '#333',
      }}>
        <AdminLayoutContent admin={admin}>
          {children}
        </AdminLayoutContent>
      </body>
    </html>
  );
}

function AdminLayoutContent({
  admin,
  children
}: {
  admin: AdminUserWithPermissions | null;
  children: React.ReactNode;
}) {
  // If not authenticated and not on login page, the page components will handle redirect
  if (!admin) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '200px',
        backgroundColor: '#333',
        color: 'white',
        padding: '20px 0',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '0 20px 20px',
          borderBottom: '1px solid #555',
          marginBottom: '20px',
        }}>
          <h1 style={{ fontSize: '18px', margin: 0 }}>DEKOP Admin</h1>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
            {admin.email}
          </div>
        </div>

        <AdminNav permissions={admin.permissions} />

        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '0',
          width: '200px',
          padding: '0 20px',
        }}>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '20px',
        maxWidth: 'calc(100% - 200px)',
        overflow: 'auto',
      }}>
        {children}
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/admin-secret-2024/api/auth/logout" method="POST">
      <button
        type="submit"
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#aaa',
          border: '1px solid #555',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Logout
      </button>
    </form>
  );
}
