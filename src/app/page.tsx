"use client";

import { useState } from "react";
import Header from "../app/components/header/header.tsx";
import Main from "../app/components/main/main.tsx";
import Footer from "./components/footer/footer.tsx";
import styles from "./page.module.css";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className={styles.page}>
      {menuOpen && <div className={styles.overlay} onClick={handleMenuToggle}></div>}

      <Header menuOpen={menuOpen} onMenuToggle={handleMenuToggle} />

      <div className={`${styles.content} ${menuOpen ? styles.blurred : ''}`}>
        <Main />
        <Footer />
      </div>
    </div>
  );
}
