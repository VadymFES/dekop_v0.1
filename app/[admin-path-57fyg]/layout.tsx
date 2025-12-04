/**
 * Лейаут адмін-панелі
 * Повністю незалежний від основного сайту - без хедера/футера
 * ClientLayout тепер пропускає header/footer для admin routes
 */

import { getCurrentAdmin, AdminUserWithPermissions } from '@/app/lib/admin-auth';
import AdminNav from './components/AdminNav';
import LogoutButton from './components/LogoutButton';
import SessionTimer from './components/SessionTimer';
import styles from './styles/admin.module.css';

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
    <AdminLayoutContent admin={admin}>
      {children}
    </AdminLayoutContent>
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
    return (
      <div className={styles.adminWrapperUnauth}>
        {children}
      </div>
    );
  }

  return (
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
  );
}
