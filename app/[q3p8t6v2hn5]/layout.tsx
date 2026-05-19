/**
 * Лейаут адмін-панелі
 * Повністю незалежний від основного сайту - без хедера/футера
 * ClientLayout тепер пропускає header/footer для admin routes
 * Includes CSRF protection provider (Task 6)
 */

import { notFound } from 'next/navigation';
import { getCurrentAdmin, AdminUserWithPermissions } from '@/app/lib/admin-auth';
import { getCurrentCsrfToken } from '@/app/lib/csrf-protection';
import { getAdminPath, getAdminUrl } from '@/app/lib/admin-path';
import AdminNav from './components/AdminNav';
import LogoutButton from './components/LogoutButton';
import SessionTimer from './components/SessionTimer';
import { CsrfProvider } from './components/CsrfProvider';
import { AdminPathProvider } from './components/AdminPathProvider';
import styles from './styles/admin.module.css';

export const metadata = {
  title: 'Адмін-панель - DEKOP',
  robots: 'noindex, nofollow',
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ 'q3p8t6v2hn5': string }>;
}

export default async function AdminLayout({ children, params }: LayoutProps) {
  // Reject any path that doesn't match the configured admin secret so unknown
  // URLs get a proper 404 instead of being swallowed by this dynamic segment.
  const { 'q3p8t6v2hn5': pathSegment } = await params;
  if (pathSegment !== getAdminPath()) {
    notFound();
  }
  const admin = await getCurrentAdmin();
  // Get or generate CSRF token for authenticated users (Task 6)
  const csrfToken = admin ? await getCurrentCsrfToken() : null;

  return (
    <AdminLayoutContent admin={admin} csrfToken={csrfToken}>
      {children}
    </AdminLayoutContent>
  );
}

function AdminLayoutContent({
  admin,
  children,
  csrfToken,
}: {
  admin: AdminUserWithPermissions | null;
  children: React.ReactNode;
  csrfToken: string | null;
}) {
  // Якщо не авторизовано - показуємо тільки дочірній контент (сторінка входу)
  if (!admin) {
    return (
      <div className={styles.adminWrapperUnauth}>
        {children}
      </div>
    );
  }

  return (
    <AdminPathProvider adminPath={getAdminUrl()}>
    <CsrfProvider initialToken={csrfToken}>
      <div className={styles.adminWrapper}>
        {/* Бічна панель навігації */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.sidebarTitle}>DEKOP Адмін</h1>
            <div className={styles.sidebarEmail}>
              {admin.email}
            </div>
            <div className={styles.sidebarRole}>
              {admin.roles.map(r => r === 'admin' ? 'Адміністратор' : r === 'manager' ? 'Менеджер' : r).join(', ')}
            </div>
          </div>

          <AdminNav permissions={admin.permissions} />

          <div className={styles.sidebarFooter}>
            <SessionTimer />
            <LogoutButton />
          </div>
        </aside>

        {/* Основний контент */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </CsrfProvider>
    </AdminPathProvider>
  );
}
