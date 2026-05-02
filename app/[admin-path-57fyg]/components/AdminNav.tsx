'use client';

/**
 * Компонент навігації адмін-панелі
 * Показує посилання на основі дозволів користувача
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../styles/admin.module.css';

// Get admin path from environment variable (Task 7)
const ADMIN_PATH = `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin'}`;

interface AdminNavProps {
  permissions: string[];
}

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

// Navigation items using dynamic admin path
const navItems: NavItem[] = [
  { href: ADMIN_PATH, label: 'Головна' },
  { href: `${ADMIN_PATH}/products`, label: 'Товари', permission: 'products.read' },
  { href: `${ADMIN_PATH}/orders`, label: 'Замовлення', permission: 'orders.read' },
  { href: `${ADMIN_PATH}/profile`, label: 'Профіль' },
];

export default function AdminNav({ permissions }: AdminNavProps) {
  const pathname = usePathname();

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission);
  };

  return (
    <nav>
      {navItems.map((item) => {
        if (!hasPermission(item.permission)) return null;

        const isActive = pathname === item.href ||
          (item.href !== ADMIN_PATH && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? styles.navLinkActive : styles.navLink}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
