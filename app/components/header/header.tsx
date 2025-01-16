"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./header.module.css";
import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

const Header = ({ menuOpen, onMenuToggle }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCatalogView, setIsCatalogView] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  const handleCatalogViewToggle = () => {
    setIsCatalogView((prev) => !prev);
    console.log('isCatalogView:', !isCatalogView);
  };

const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  setSearchQuery(e.target.value);
};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(event.target as Node)) {
        setIsCatalogView(false); 
      }
    };

    if (isCatalogView) {
      document.addEventListener("mousedown", handleClickOutside); 
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside); 
    };
  }, [isCatalogView]);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Burger Menu Icon on the left */}
        <button onClick={onMenuToggle} className={styles.burgerMenu} aria-label="Menu">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 5.5C2 5.22386 2.44772 5 3 5H21C21.5523 5 22 5.22386 22 5.5C22 5.77614 21.5523 6 21 6H3C2.44772 6 2 5.77614 2 5.5Z" fill="#160101" />
            <path d="M2 11.5322C2 11.256 2.44772 11.0322 3 11.0322H21C21.5523 11.0322 22 11.256 22 11.5322C22 11.8083 21.5523 12.0322 21 12.0322H3C2.44772 12.0322 2 11.8083 2 11.5322Z" fill="#160101" />
            <path d="M3 17.0645C2.44772 17.0645 2 17.2883 2 17.5645C2 17.8406 2.44772 18.0645 3 18.0645H21C21.5523 18.0645 22 17.8406 22 17.5645C22 17.2883 21.5523 17.0645 21 17.0645H3Z" fill="#160101" />
          </svg>
        </button>

        {/* Logo */}
        <div className={styles.logo_header}>
          <Link href="/">
            <Image 
            src="/logomain.png" 
            alt="Logo" 
            width={126.15} height={68} 
            />
          </Link>
        </div>

        {/* Conditionally render burger menu items on smaller screens */}
        <div className={`${styles.menuContainer} ${menuOpen ? styles.menuOpen : ''} ${isCatalogView ? styles.noShadow : ''}`}>          <div className={styles.menuHeader}>
            {isCatalogView ? (
              <button onClick={handleCatalogViewToggle} className={styles.menuBackButton}>
<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 8L8 12M8 12L12 16M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
        stroke="#160101" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        transform="translate(2, 2)" />
</svg>
                Back
              </button>
            ) : (
              <div className={styles.openBurgerLines}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 5.5C2 5.22386 2.44556 5 2.99519 5H11.0048C11.5544 5 12 5.22386 12 5.5C12 5.77614 11.5544 6 11.0048 6H2.99519C2.44556 6 2 5.77614 2 5.5Z" fill="#160101" />
                  <path d="M2 11.5046C2 11.2284 2.44556 11.0046 2.99519 11.0046H21.0048C21.5544 11.0046 22 11.2284 22 11.5046C22 11.7808 21.5544 12.0046 21.0048 12.0046H2.99519C2.44556 12.0046 2 11.7808 2 11.5046Z" fill="#160101" />
                  <path d="M2.99519 17.0096C2.44556 17.0096 2 17.2335 2 17.5096C2 17.7857 2.44556 18.0096 2.99519 18.0096H15.0048C15.5544 18.0096 16 17.7857 16 17.5096C16 17.2335 15.5544 17.0096 15.0048 17.0096H2.99519Z" fill="#160101" />
                </svg>
              </div>
            )}
            <button onClick={onMenuToggle} className={styles.closeButton} aria-label="Close Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="#160101" strokeLinecap="round" strokeLinejoin="round"  />
              </svg>
            </button>
          </div>


          <div className={styles.separatorLine}></div>

          {/* Search and Links */}
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className={styles.searchBar}
          />
          <div className={styles.activityButtons}>

                <button onClick={handleCatalogViewToggle} className={styles.navButton}>
                  <span>Каталог</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isCatalogView && (
  <div className={styles.dropdown}>
    <ul className={styles.catalogList}>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Столи</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Стільці</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Кухні</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Шафи</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Дивани</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Ліжка</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Матраци</span>
        </Link>
      </li>
      <li>
        <Link className={styles.dropdownItem} href={"/category"}>
          <span className={`${styles.navButton} ${styles.navButtonCat}`}>Інше</span>
        </Link>
      </li>
    </ul>
  </div>
)}


            <>
                <Link className={styles.navButton} href="/individual-order">Під замовлення</Link>
                <Link className={styles.menuTextButton} href="/account">Профіль</Link>
                <Link className={styles.menuTextButton} href="/notifications">Повідомлення</Link>
                <Link className={styles.navButton} href="/about-us">Про нас</Link>
                <Link className={styles.navButton} href="/contact-us">Контакти</Link>
              </>
          </div>

        </div>

        <div className={`${styles.rightIcons} ${menuOpen ? styles.hideIcons : ''}`}>

          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Account">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.7186 9.33231L13.7185 9.33238C12.7998 10.3568 11.4765 11 10 11C8.52355 11 7.20017 10.3568 6.2815 9.33238L6.28144 9.33231C5.48495 8.44426 5 7.28005 5 6C5 3.23878 7.23878 1 10 1C12.7612 1 15 3.23878 15 6C15 7.28005 14.515 8.44426 13.7186 9.33231ZM10 12C11.775 12 13.3645 11.225 14.463 10C15.4155 8.938 16 7.539 16 6C16 2.6865 13.3135 0 10 0C6.6865 0 4 2.6865 4 6C4 7.539 4.5845 8.938 5.537 10C6.6355 11.225 8.225 12 10 12ZM9.32171 16.7348L10 17.3609L10.6783 16.7348L15.0068 12.7392C16.877 14.1858 18.1781 16.4213 18.448 19H1.55198C1.82186 16.4213 3.12296 14.1858 4.99321 12.7392L9.32171 16.7348ZM19.453 19C19.1501 15.7975 17.4077 13.0472 14.9215 11.457L10 16L5.0785 11.457C2.59228 13.0472 0.849949 15.7975 0.54703 19C0.515928 19.3288 0.5 19.6624 0.5 20H1.5H18.5H19.5C19.5 19.6624 19.4841 19.3288 19.453 19Z" fill="#160101" />
              </svg>

              <span className={styles.iconLabel}>Account</span>
            </button>
          </div>

          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Notification">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8.35442 20C9.05956 20.6224 9.9858 21 11.0002 21C12.0147 21 12.9409 20.6224 13.6461 20M1.29414 4.81989C1.27979 3.36854 2.06227 2.01325 3.32635 1.3M20.7024 4.8199C20.7167 3.36855 19.9342 2.01325 18.6702 1.3M17.0002 7C17.0002 5.4087 16.3681 3.88258 15.2429 2.75736C14.1177 1.63214 12.5915 1 11.0002 1C9.40895 1 7.88283 1.63214 6.75761 2.75736C5.63239 3.88258 5.00025 5.4087 5.00025 7C5.00025 10.0902 4.22072 12.206 3.34991 13.6054C2.61538 14.7859 2.24811 15.3761 2.26157 15.5408C2.27649 15.7231 2.31511 15.7926 2.46203 15.9016C2.59471 16 3.19284 16 4.3891 16H17.6114C18.8077 16 19.4058 16 19.5385 15.9016C19.6854 15.7926 19.724 15.7231 19.7389 15.5408C19.7524 15.3761 19.3851 14.7859 18.6506 13.6054C17.7798 12.206 17.0002 10.0902 17.0002 7Z" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={styles.badge}>3</span> {/* Example notification count */}
              <span className={styles.iconLabel}>Notification</span>
            </button>

          </div>

          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Liked">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10.2389 1.87075C10.4835 1.37713 10.6057 1.13031 10.7717 1.05146C10.9161 0.982848 11.0839 0.982848 11.2283 1.05146C11.3943 1.13031 11.5165 1.37713 11.7611 1.87075L14.081 6.55392C14.1531 6.69965 14.1892 6.77251 14.242 6.82908C14.2887 6.87918 14.3447 6.91976 14.4069 6.94859C14.4772 6.98115 14.5579 6.99291 14.7193 7.01641L19.9085 7.7722C20.455 7.85179 20.7282 7.89159 20.8546 8.02458C20.9646 8.14029 21.0164 8.29929 20.9954 8.45731C20.9714 8.63894 20.7736 8.83092 20.3779 9.21488L16.6244 12.8579C16.5074 12.9714 16.4489 13.0282 16.4111 13.0958C16.3777 13.1556 16.3563 13.2213 16.348 13.2893C16.3386 13.3661 16.3524 13.4463 16.3801 13.6067L17.2657 18.7522C17.3591 19.295 17.4058 19.5663 17.3181 19.7274C17.2417 19.8675 17.1059 19.9657 16.9486 19.9948C16.7678 20.0282 16.5232 19.9 16.0342 19.6437L11.395 17.2127C11.2505 17.137 11.1782 17.0991 11.1021 17.0842C11.0347 17.0711 10.9653 17.0711 10.8979 17.0842C10.8218 17.0991 10.7495 17.137 10.605 17.2127L5.96584 19.6437C5.47675 19.9 5.23221 20.0282 5.05138 19.9948C4.89406 19.9657 4.75831 19.8675 4.68194 19.7274C4.59416 19.5663 4.64087 19.295 4.73428 18.7522L5.61995 13.6067C5.64756 13.4463 5.66136 13.3661 5.65202 13.2893C5.64375 13.2213 5.62231 13.1556 5.58888 13.0958C5.55113 13.0282 5.49263 12.9714 5.37562 12.8579L1.62206 9.21488C1.22645 8.83092 1.02864 8.63894 1.00457 8.45731C0.983627 8.29929 1.03537 8.14029 1.14538 8.02458C1.27182 7.89159 1.54505 7.85179 2.0915 7.7722L7.28073 7.01641C7.44211 6.99291 7.5228 6.98115 7.59307 6.94859C7.65529 6.91976 7.71131 6.87918 7.75801 6.82908C7.81076 6.77251 7.84686 6.69965 7.91905 6.55392L10.2389 1.87075Z" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <span className={styles.iconLabel}>Liked</span>
            </button>
          </div>

          <div className={styles.iconContainer}>
            <button className={styles.iconButton} aria-label="Cart">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3.52 1.64L1.96 3.72C1.65102 4.13198 1.49652 4.33797 1.50011 4.51039C1.50323 4.66044 1.57358 4.80115 1.69175 4.89368C1.82754 5 2.08503 5 2.6 5H17.4C17.915 5 18.1725 5 18.3083 4.89368C18.4264 4.80115 18.4968 4.66044 18.4999 4.51039C18.5035 4.33797 18.349 4.13198 18.04 3.72L16.48 1.64M3.52 1.64C3.696 1.40533 3.784 1.288 3.89552 1.20338C3.9943 1.12842 4.10616 1.0725 4.22539 1.03845C4.36 1 4.50667 1 4.8 1H15.2C15.4933 1 15.64 1 15.7746 1.03845C15.8938 1.0725 16.0057 1.12842 16.1045 1.20338C16.216 1.288 16.304 1.40533 16.48 1.64M3.52 1.64L1.64 4.14666C1.40254 4.46328 1.28381 4.62159 1.1995 4.79592C1.12469 4.95062 1.07012 5.11431 1.03715 5.28296C1 5.47301 1 5.6709 1 6.06666L1 17.8C1 18.9201 1 19.4802 1.21799 19.908C1.40973 20.2843 1.71569 20.5903 2.09202 20.782C2.51984 21 3.07989 21 4.2 21L15.8 21C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V6.06667C19 5.6709 19 5.47301 18.9628 5.28296C18.9299 5.11431 18.8753 4.95062 18.8005 4.79592C18.7162 4.62159 18.5975 4.46328 18.36 4.14667L16.48 1.64M14 9C14 10.0609 13.5786 11.0783 12.8284 11.8284C12.0783 12.5786 11.0609 13 10 13C8.93913 13 7.92172 12.5786 7.17157 11.8284C6.42143 11.0783 6 10.0609 6 9" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={styles.badge}>5</span> {/* Example cart item count */}
              <span className={styles.iconLabel}>Cart</span>
            </button>

          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
