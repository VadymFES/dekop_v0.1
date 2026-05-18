import styles from './about-us.module.css';
import Link from 'next/link';

export const metadata = {
  title: 'Про нас - Dekop',
  description: 'Dekop — виробник і продавець якісних меблів у Костополі. Дізнайтесь більше про нашу компанію, цінності та підхід до роботи.',
};

const STATS = [
  { value: '15+', label: 'років на ринку' },
  { value: '5 000+', label: 'задоволених клієнтів' },
  { value: 'День у день', label: 'доставка після замовлення' },
  { value: '100%', label: 'українське виробництво' },
];

const VALUES = [
  {
    title: 'Якість матеріалів',
    desc: 'Використовуємо перевірену деревину, фурнітуру та оббивні тканини від надійних постачальників.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    title: 'Власне виробництво',
    desc: 'Меблі виготовляємо самостійно на нашому підприємстві в Костополі.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    title: 'Індивідуальний підхід',
    desc: 'Беремося за нестандартні замовлення: меблі під розмір, довільний колір або специфічне планування.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    title: 'Чесні ціни',
    desc: 'Ціна відображає реальну вартість матеріалів і праці.',
    icon: (
      <span aria-hidden="true" style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1 }}>₴</span>
    ),
  },
  {
    title: 'Доставка та збирання',
    desc: 'Організовуємо доставку по всій Україні та пропонуємо послугу монтажу меблів на місці.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    title: 'Гарантія якості',
    desc: 'На весь асортимент діє гарантія від виробника. Якщо щось пішло не так — вирішимо питання швидко.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
];

const HIGHLIGHTS = [
  'Меблі виготовляємо з масиву та MDF з натуральним шпоном',
  'Приймаємо замовлення на кухні, шафи-купе, дитячі та вітальні гарнітури',
  'Виставкові зали у Костополі та Рівному — можна побачити меблі вживу та отримати консультацію',
  'Консультуємо безкоштовно: виїжджаємо на заміри, допомагаємо з вибором',
  'Власна бригада збирання — меблі встановлюємо обережно і вчасно',
];

export default function AboutUsPage() {
  return (
    <div className={styles.page}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="breadcrumb">
        <Link href="/">На головну</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActive}>Про нас</span>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Dekop — меблі, зроблені з розумінням</h1>
          <p className={styles.heroDesc}>
            Ми виробляємо та продаємо меблі для дому з 2015 року. Наше виробництво розташоване у
            Костополі на Рівненщині: від заготовки матеріалу до фінального складання — усе
            робимо власними руками. Якщо ви шукаєте надійні меблі без зайвих переплат,
            ви знайшли потрібне місце.
          </p>
          <div className={styles.heroActions}>
            <Link href="/catalog" className={styles.btnPrimary}>Перейти до каталогу</Link>
            <Link href="/contacts" className={styles.btnSecondary}>Зв&apos;язатися з нами</Link>
          </div>
        </div>
        <div className={styles.heroImageWrap} aria-label="Фото виробництва — placeholder">
          <div className={styles.imagePlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Фото виробництва</span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className={styles.statsStrip} aria-label="Компанія в цифрах">
        {STATS.map(({ value, label }) => (
          <div key={label} className={styles.statItem}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </section>

      {/* Story */}
      <section className={styles.story}>
        <div className={styles.storyImages}>
          <div className={`${styles.imagePlaceholder} ${styles.storyImageMain}`}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Шоурум</span>
          </div>
          <div className={`${styles.imagePlaceholder} ${styles.storyImageSecondary}`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Майстерня</span>
          </div>
        </div>
        <div className={styles.storyText}>
          <h2 className={styles.sectionTitle}>Наша історія</h2>
          <p>
            Dekop виріс із невеликої столярної майстерні в м. Костополь. Спочатку ми
            виготовляли меблі для місцевих замовників, орієнтуючись виключно на якість і чесні
            домовленості. З часом попит зріс, і майстерня перетворилась на повноцінне
            підприємство з власним виставковим залом і онлайн-магазином.
          </p>
          <p>
            Сьогодні в команді Dekop — досвідчені майстри, дизайнери та менеджери, які
            щодня працюють над тим, щоб кожне замовлення було виконане точно у строк і
            відповідало очікуванням клієнта.
          </p>
          <p>
            Виробляємо меблі для спальні, вітальні, дитячих кімнат, кухні та офісу. Весь
            асортимент — у нашому каталозі, а якщо потрібне щось нестандартне — ми готові
            зробити на замовлення.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className={styles.valuesSection}>
        <h2 className={styles.sectionTitle}>Що для нас важливо</h2>
        <div className={styles.valuesGrid}>
          {VALUES.map(({ title, desc, icon }) => (
            <div key={title} className={styles.valueCard}>
              <div className={styles.valueIcon}>{icon}</div>
              <h3 className={styles.valueTitle}>{title}</h3>
              <p className={styles.valueDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className={styles.highlightsSection}>
        <div className={styles.highlightsImageWrap} aria-label="Фото готових меблів — placeholder">
          <div className={styles.imagePlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Готові меблі</span>
          </div>
        </div>
        <div className={styles.highlightsText}>
          <h2 className={styles.sectionTitle}>Чому обирають Dekop</h2>
          <ul className={styles.highlightsList}>
            {HIGHLIGHTS.map((item) => (
              <li key={item} className={styles.highlightItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--hover-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Готові обрати меблі?</h2>
        <p className={styles.ctaDesc}>
          Перегляньте каталог або зв&apos;яжіться з нами — підберемо варіант під ваш
          інтер&apos;єр і бюджет.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/catalog" className={styles.btnPrimary}>Каталог меблів</Link>
          <Link href="/individual-order" className={styles.btnSecondary}>Замовити під розмір</Link>
        </div>
      </section>
    </div>
  );
}
