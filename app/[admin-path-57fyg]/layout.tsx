/**
 * Лейаут адмін-панелі
 * Повністю незалежний від основного сайту - без хедера/футера
 * ClientLayout тепер пропускає header/footer для admin routes
 * Includes CSRF protection provider (Task 6)
 */

import { notFound } from 'next/navigation';
import { getCurrentAdmin, AdminUserWithPermissions } from '@/app/lib/admin-auth';
import { getCurrentCsrfToken } from '@/app/lib/csrf-protection';
import AdminNav from './components/AdminNav';
import LogoutButton from './components/LogoutButton';
import SessionTimer from './components/SessionTimer';
import { CsrfProvider } from './components/CsrfProvider';
import styles from './styles/admin.module.css';

export const metadata = {
  title: 'Адмін-панель - DEKOP',
  robots: 'noindex, nofollow',
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ 'admin-path-57fyg': string }>;
}

export default async function AdminLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;
  // Use the private server-only env var so the admin path secret is never
  // bundled into client-side JS (NEXT_PUBLIC_ vars are exposed in the browser).
  const adminPath = process.env.ADMIN_PATH_SECRET || process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin';
  if (resolvedParams['admin-path-57fyg'] !== adminPath) {
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
  );
}
