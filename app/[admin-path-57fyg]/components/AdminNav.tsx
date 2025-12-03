'use client';

/**
 * Компонент навігації адмін-панелі
 * Показує посилання на основі дозволів користувача
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  permissions: string[];
}

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { href: '/admin-path-57fyg', label: 'Головна' },
  { href: '/admin-path-57fyg/products', label: 'Товари', permission: 'products.read' },
  { href: '/admin-path-57fyg/orders', label: 'Замовлення', permission: 'orders.read' },
  { href: '/admin-path-57fyg/profile', label: 'Профіль' },
];

export default function AdminNav({ permissions }: AdminNavProps) {
  const pathname = usePathname();

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return permissions.includes(permission);
  };

  const linkStyle = (isActive: boolean) => ({
    display: 'block',
    padding: '12px 20px',
    color: isActive ? 'white' : '#ccc',
    backgroundColor: isActive ? '#555' : 'transparent',
    textDecoration: 'none',
    fontSize: '14px',
    borderLeft: isActive ? '3px solid white' : '3px solid transparent',
  });

  return (
    <nav>
      {navItems.map((item) => {
        if (!hasPermission(item.permission)) return null;

        const isActive = pathname === item.href ||
          (item.href !== '/admin-path-57fyg' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            style={linkStyle(isActive)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
