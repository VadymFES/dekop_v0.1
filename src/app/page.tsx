"use client";

import Header from "../app/components/header/header.tsx";
import Main from "../app/components/main/main.tsx";
import Footer from "../app/components/footer/footer.tsx";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <Main />
      <Footer />
    </div>
  );
}
