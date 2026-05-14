import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import styles from './page.module.css';
import NotifyForm from './NotifyForm';

export const metadata: Metadata = {
  title: 'Незабаром | Dekop Furniture',
  description: 'Наш магазин меблів незабаром відкриється. Підпишіться, щоб дізнатися першими.',
};

export default function ComingSoonPage() {
  return (
    <main className={styles.page}>

      {/* Animated background furniture silhouettes */}
      <div className={styles.scene}>
        {/* Sofa */}
        <svg className={styles.sofa} width="520" height="260" viewBox="0 0 520 260" fill="none">
          <rect x="20" y="120" width="480" height="100" rx="18" fill="#160101"/>
          <rect x="20" y="80" width="100" height="140" rx="14" fill="#160101"/>
          <rect x="400" y="80" width="100" height="140" rx="14" fill="#160101"/>
          <rect x="40" y="60" width="440" height="80" rx="14" fill="#160101"/>
          <rect x="60" y="220" width="40" height="30" rx="6" fill="#160101"/>
          <rect x="420" y="220" width="40" height="30" rx="6" fill="#160101"/>
        </svg>

        {/* Armchair */}
        <svg className={styles.armchair} width="280" height="240" viewBox="0 0 280 240" fill="none">
          <rect x="40" y="100" width="200" height="100" rx="14" fill="#160101"/>
          <rect x="10" y="80" width="60" height="120" rx="12" fill="#160101"/>
          <rect x="210" y="80" width="60" height="120" rx="12" fill="#160101"/>
          <rect x="40" y="50" width="200" height="70" rx="12" fill="#160101"/>
          <rect x="60" y="200" width="30" height="28" rx="5" fill="#160101"/>
          <rect x="190" y="200" width="30" height="28" rx="5" fill="#160101"/>
        </svg>

        {/* Floor lamp */}
        <svg className={styles.lamp} width="100" height="340" viewBox="0 0 100 340" fill="none">
          <rect x="44" y="80" width="12" height="240" rx="6" fill="#160101"/>
          <ellipse cx="50" cy="320" rx="36" ry="10" fill="#160101"/>
          <path d="M10 80 Q50 10 90 80Z" fill="#160101"/>
          <ellipse cx="50" cy="80" rx="40" ry="10" fill="#160101"/>
        </svg>

        {/* Coffee table */}
        <svg className={styles.table} width="360" height="140" viewBox="0 0 360 140" fill="none">
          <rect x="20" y="40" width="320" height="30" rx="8" fill="#160101"/>
          <rect x="40" y="70" width="18" height="60" rx="5" fill="#160101"/>
          <rect x="302" y="70" width="18" height="60" rx="5" fill="#160101"/>
          <rect x="10" y="30" width="340" height="18" rx="6" fill="#160101"/>
        </svg>
      </div>

      {/* Main content */}
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logo}>
          <Image
            src="/logomain.png"
            alt="Dekop"
            width={320}
            height={110}
            className={styles.logoImg}
            style={{ height: '110px', width: 'auto' }}
            priority
            quality={85}
            sizes="(max-width: 480px) 200px, 320px"
          />
        </div>

        {/* Decorative divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
        </div>

        <p className={styles.sub}>Незабаром</p>

        <h1 className={styles.headline}>
          Новий простір
          <span className={styles.headlineAccent}>для вашого дому</span>
        </h1>

        <p className={styles.body}>
          Ми готуємо щось особливе — колекцію меблів, яка поєднує стиль,
          якість і комфорт. Наш онлайн-магазин відкриється зовсім скоро.
        </p>

        {/* Dot ruler */}
        <div className={styles.ruler}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={styles.rulerDot} />
          ))}
        </div>

        {/* Notify form */}
        <Suspense fallback={<div className={styles.form} />}>
          <NotifyForm />
        </Suspense>

        {/* Socials */}
        <div className={styles.socials}>
          {/* Instagram */}
          <a href="https://www.instagram.com/meblidekor4you/" className={styles.socialLink} aria-label="Instagram">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          {/* Facebook */}
          <a href="https://www.facebook.com/profile.php?id=100093951543078" className={styles.socialLink} aria-label="Facebook">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
          </a>
          {/* Telegram */}
          <a href="#" className={styles.socialLink} aria-label="Telegram">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/>
              <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </a>
        </div>
      </div>

      <span className={styles.tag}>Dekop Furniture Enterprise © {new Date().getFullYear()}</span>
    </main>
  );
}
