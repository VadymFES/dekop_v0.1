"use client";

import { useState, useEffect } from "react";
import Header from "./components/header/header.tsx";
import Main from "./components/main/main.tsx";
import Footer from "./components/footer/footer.tsx";
import styles from "./page.module.css";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen);
  };

  // Handle screen resize to close the menu if width exceeds the breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 913 && menuOpen) {
        setMenuOpen(false); 
      }
    };

    // Add resize event listener
    window.addEventListener("resize", handleResize);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  return (
    <div className={styles.page}>
      {/* Only show overlay when menu is open */}
      {menuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
        ></div>
      )}
      <Header menuOpen={menuOpen} onMenuToggle={handleMenuToggle}/>
      <Main />
      <Footer />
    </div>
  );
}
