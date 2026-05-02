// app/ClientLayout.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/app/shared/components/header/header";
import Footer from "@/app/shared/components/footer/footer";
import styles from "./page.module.css";

interface ClientLayoutProps {
  children: React.ReactNode;
  isAdminRoute: boolean;
}

export default function ClientLayout({
  children,
  isAdminRoute,
}: ClientLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Admin routes - no header/footer
  if (isAdminRoute) {
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