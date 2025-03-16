// app/ClientLayout.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/app/shared/components/header/header";
import Footer from "@/app/shared/components/footer/footer";
import styles from "./page.module.css"; 

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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