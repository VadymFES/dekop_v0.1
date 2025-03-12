// pages/_app.tsx
import type { AppProps } from "next/app";
import { useState, useEffect, useCallback } from "react";

import Header from "@/app/components/header/header";
import Footer from "@/app/components/footer/footer";
import QueryProvider from "@/app/providers/QueryProvider";
import "@/app/globals.css"; 
import styles from "./layout.module.css";

export default function Pages({ Component, pageProps }: AppProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Close menu if screen becomes large
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
    <QueryProvider>
      {menuOpen && (
        <div className={styles.overlay} onClick={handleOverlayClick} />
      )}
    <div className={styles.page}>
    <Header menuOpen={menuOpen} onMenuToggle={handleMenuToggle} />
      <main className={styles.mainContent}>
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
    </QueryProvider>
  );
}
