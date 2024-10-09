"use client";

import { useState } from "react";
import styles from "./header.module.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCatalogToggle = () => {
    setCatalogOpen(!catalogOpen);
  };

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <div className={styles.logo_header}>My Store</div>

        <div className={styles.activities}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className={styles.searchBar}
          />
          <div className={styles.activityButtons}>
            <div className={styles.catalogWrapper}>
              <button onClick={handleCatalogToggle} className={styles.navButton}>
                Catalog
              </button>
              {catalogOpen && (
                <ul className={styles.dropdown}>
                  <li className={styles.dropdownItem}>Category 1</li>
                  <li className={styles.dropdownItem}>Category 2</li>
                  <li className={styles.dropdownItem}>Category 3</li>
                </ul>
              )}
            </div>
            <button className={styles.navButton}>Home</button>
            <button className={styles.navButton}>About</button>
            <button className={styles.navButton}>Contact</button>
          </div>
        </div>
        <div className={styles.rightIcons}>
          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Account">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg> {/* Account Icon */}
            </button>
            <span className={styles.iconLabel}>Account</span>
          </div>
          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Notification">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M19 8h-2V6c0-3.31-2.69-6-6-6S5 2.69 5 6v2H3c-1.1 0-2 .9-2 2v1h20V10c0-1.1-.9-2-2-2zm-8 12h-4v-1h4v1zm0 0h4v-1h-4v1zm6 0h4v-1h-4v1zM5 10v8h14v-8H5z" />
              </svg> {/* Notification Icon */}
            </button>
            <span className={styles.iconLabel}>Notification</span>
          </div>
          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Liked">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg> {/* Liked Icon */}
            </button>
            <span className={styles.iconLabel}>Liked</span>
          </div>
          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Cart">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M7 4h-2v2h2V4zm0 4h-2v2h2V8zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2zm10-12h-2v2h2V4zm0 4h-2v2h2V8zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2zM2 4h3v16H2V4zm18 0h2v16h-2V4z" />
              </svg> {/* Cart Icon */}
            </button>
            <span className={styles.iconLabel}>Cart</span>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;