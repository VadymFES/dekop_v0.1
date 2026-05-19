'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminPath } from './AdminPathProvider';
import styles from '../styles/admin.module.css';

interface AdminNavProps {
  permissions: string[];
}

interface NavItem {
  label: string;
  subPath: string;
  permission?: string;
}

const navItemDefs: NavItem[] = [
  { subPath: '', label: 'Головна' },
  { subPath: '/products', label: 'Товари', permission: 'products.read' },
  { subPath: '/orders', label: 'Замовлення', permission: 'orders.read' },
  { subPath: '/kitchens', label: 'Кухні' },
  { subPath: '/profile', label: 'Профіль' },
];

export default function AdminNav({ permissions }: AdminNavProps) {
  const adminPath = useAdminPath();
  const pathname = usePathname();

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission);
  };

  return (
    <nav>
      {navItemDefs.map((item) => {
        if (!hasPermission(item.permission)) return null;

        const href = `${adminPath}${item.subPath}`;
        const isActive = pathname === href ||
          (item.subPath !== '' && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={isActive ? styles.navLinkActive : styles.navLink}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
