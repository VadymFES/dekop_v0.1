// app/ClientLayout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/app/shared/components/header/header";
import Footer from "@/app/shared/components/footer/footer";
import styles from "./page.module.css";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);
  const [hostnameChecked, setHostnameChecked] = useState(false);

  // Check if we're on admin subdomain (client-side only)
  useEffect(() => {
    const hostname = window.location.hostname;
    // Check for admin.dekop.com.ua or admin.localhost patterns
    const isAdmin = hostname.startsWith('admin.') || hostname === 'admin.dekop.com.ua';
    setIsAdminSubdomain(isAdmin);
    setHostnameChecked(true);
  }, []);

  // Admin by path - immediately render without header/footer
  const isAdminByPath = pathname?.startsWith('/admin-path-57fyg');

  // Skip header/footer for admin routes (by path or subdomain)
  const isAdminRoute = isAdminByPath || isAdminSubdomain;

  const handleMenuToggle = () => {
    setMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 913 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  // For admin routes by path, render without header/footer immediately
  if (isAdminByPath) {
    return <>{children}</>;
  }

  // Wait for hostname check before deciding to show header/footer
  // This prevents flash when accessing via admin subdomain
  if (!hostnameChecked) {
    return (
      <div className={styles.page}>
        <main>{children}</main>
      </div>
    );
  }

  // Admin subdomain - no header/footer
  if (isAdminSubdomain) {
    return <>{children}</>;
  }

  // Regular site - show header/footer
  return (
    <div className={styles.page}>
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
      <Header menuOpen={menuOpen} onMenuToggle={handleMenuToggle} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}