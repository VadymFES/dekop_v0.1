"use client";

import React, { useState } from "react";
import Head from "next/head";
import Header from "../app/components/header/header";
import Footer from "../app/components/footer/footer";
import "@/app/globals.css";
import QueryProvider from "../app/providers/QueryProvider";
import styles from "./layout.module.css";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);


  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.png" sizes="16x16" type="image/png" />
      </Head>

      {/* Overlay when menu is open */}
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)}></div>}

      {/* Header and Layout */}
      <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((prev) => !prev)} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
