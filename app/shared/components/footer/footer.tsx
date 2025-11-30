import styles from "./footer.module.css";
import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMenu}>
        <div className={styles.footerContacts}>
          <Image
              src="/logomain_white.png" 
              alt="Company Logo" 
              className={styles.footerLogo} 
              width = {200}
              height = {110}
              />
          <address className={styles.footerContactsInfo}>
            <p className={styles.footerContactsText}>
            об’їзна м. Костопіль, с. мала Любаша вул. Кленова 1, м. Костопіль, Рівненська область, Україна, 35000
            </p>
            <p className={styles.footerContactsText}>
              тел.: +38 (098) 220 85 69 
            </p>
            <p className={styles.footerContactsText}>
              email:
              <a href="mailto:info@decop.com.ua" className={styles.footerContactsLink}>
                info@decop.com.ua
              </a>
            </p>
          </address>
        </div>

        {/* Schedule section comes right after contacts */}
        <div className={styles.schedule}>
          <h3 className={styles.scheduleTitle}>Графік роботи</h3>
          <p className={styles.scheduleText}>Пн-Пт: 9:00 - 20:00</p>
          <p className={styles.scheduleText}>Сб-Нд: 10:00 - 18:00</p>
        </div>

        {/* About Us section */}
        <div className={styles.aboutUs}>
          <h3 className={styles.aboutUsTitle}>Про компанію</h3>
          <Link href="/about-us" className={styles.footerLink}>Про нас</Link>
          <Link href="/contact-us" className={styles.footerLink}>Звяжіться з нами</Link>
        </div>

        {/* For Client section */}
        <div className={styles.forClient}>
          <h3 className={styles.forClientTitle}>Клієнтам</h3>
          <Link href="/privacy-policy" className={styles.footerLink}>Політика конфіденційності</Link>
          <Link href="/payment-delivery-policy" className={styles.footerLink}>Оплата та доставка</Link>
          <Link href="/return-policy" className={styles.footerLink}>Повернення та обмін</Link>
          <Link href="/user-agreement" className={styles.footerLink}>Угода користувача</Link>
        </div>
      </div>

      {/* Social media links section */}
      <div className={styles.footerSocial}>
        <div className={styles.footerSocialIcons}>
          <a 
            href="https://www.facebook.com/" 
            target="_blank" 
            rel="noreferrer" 
            className={styles.footerSocialIcon} 
            aria-label="Facebook"
          >
            <Image src="/facebook.png" alt="facebook" height={30} width={30} />
          </a>

          <a 
            href="https://www.viber.com/" 
            target="_blank" 
            rel="noreferrer" 
            className={styles.footerSocialIcon} 
            aria-label="Viber"
          >
            <Image src="/viber.png" alt="viber" height={30} width={30} />
          </a>

          <a 
            href="https://www.telegram.com/" 
            target="_blank" 
            rel="noreferrer" 
            className={styles.footerSocialIcon} 
            aria-label="Telegram"
          >
            <Image src="/telegram.png" alt="telegram" height={30} width={30}/>
          </a>

        </div>
      </div>

      <div className={styles.footerCopy}>
        <p className={styles.footerCopyText}>&copy; 2025 Decor. All rights reserved</p>
      </div>
    </footer>
  );
};

export default Footer;
