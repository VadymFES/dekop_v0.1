/**
 * Лейаут адмін-панелі
 * Повністю незалежний від основного сайту - без хедера/футера
 */

import { getCurrentAdmin, AdminUserWithPermissions } from '@/app/lib/admin-auth';
import AdminNav from './components/AdminNav';
import LogoutButton from './components/LogoutButton';

export const metadata = {
  title: 'Адмін-панель - DEKOP',
  robots: 'noindex, nofollow',
};

interface LayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: LayoutProps) {
  const admin = await getCurrentAdmin();

  return (
    <html lang="uk">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
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
  // Якщо не авторизовано - показуємо тільки дочірній контент (сторінка входу)
  if (!admin) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Бічна панель навігації */}
      <aside style={{
        width: '220px',
        backgroundColor: '#333',
        color: 'white',
        padding: '20px 0',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <div style={{
          padding: '0 20px 20px',
          borderBottom: '1px solid #555',
          marginBottom: '20px',
        }}>
          <h1 style={{ fontSize: '18px', margin: 0 }}>DEKOP Адмін</h1>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
            {admin.email}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            {admin.roles.map(r => r === 'admin' ? 'Адміністратор' : r === 'manager' ? 'Менеджер' : r).join(', ')}
          </div>
        </div>

        <AdminNav permissions={admin.permissions} />

        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '0',
          width: '220px',
          padding: '0 20px',
          boxSizing: 'border-box',
        }}>
          <LogoutButton />
        </div>
      </aside>

      {/* Основний контент */}
      <main style={{
        flex: 1,
        marginLeft: '220px',
        padding: '20px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  );
}
