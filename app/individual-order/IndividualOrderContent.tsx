'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import ProductCard from '@/app/shared/components/productCard/productCard';
import styles from './individual-order.module.css';
import { submitIndividualOrder } from './actions';
import type { ProductWithImages } from '@/app/lib/definitions';

const PRODUCT_TYPES = [
  'Стіл',    'Диван',            'Тумба',
  'Стілець', 'Ліжко',            'Комод',
  'Кухня',   'Настінна полиця',  'Столик для макіяжу',
  'Шафа',    'Книжкова полиця',  'Пуф',
];

const COLORS = [
  'Білий',  'Коричневий', 'Жовтий',
  'Сірий',  'Синій',      'Рожевий',
  'Чорний', 'Зелений',    'Інше',
  'Бежевий','Червоний',
];

const APPLIANCES = [
  'Духова шафа',        'Мікрохвильова піч',
  'Посудомийна машина', 'Витяжка',
];

function getDotRange(current: number, total: number, max: number): [number, number] {
  if (total <= max) return [0, total - 1];
  const half = Math.floor(max / 2);
  let start = current - half;
  let end = start + (max - 1);
  if (start < 0) { start = 0; end = max - 1; }
  if (end >= total) { end = total - 1; start = end - (max - 1); }
  return [start, end];
}

interface Props {
  suggestions: ProductWithImages[];
}

export default function IndividualOrderContent({ suggestions }: Props) {
  const [selectedTypes, setSelectedTypes]       = useState<string[]>([]);
  const [selectedColors, setSelectedColors]     = useState<string[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);
  const [construction, setConstruction]         = useState<string>('');
  const [showComment, setShowComment]           = useState(false);

  const isKitchen = selectedTypes.includes('Кухня');

  const toggleType      = (v: string) => setSelectedTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleColor     = (v: string) => setSelectedColors(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleAppliance = (v: string) => setSelectedAppliances(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const [formState, formAction, pending] = useActionState(submitIndividualOrder, null);

  // Carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselSlides, setCarouselSlides] = useState(1);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    setCarouselIndex(Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth));
  }, []);

  const handleResize = useCallback(() => {
    if (!carouselRef.current) return;
    setCarouselSlides(Math.ceil(carouselRef.current.scrollWidth / carouselRef.current.clientWidth));
    handleScroll();
  }, [handleScroll]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    handleResize();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, handleScroll]);

  const scrollLeft  = () => carouselRef.current?.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
  const scrollRight = () => carouselRef.current?.scrollBy({ left: carouselRef.current.clientWidth,  behavior: 'smooth' });
  const scrollTo    = (i: number) => carouselRef.current?.scrollTo({ left: i * carouselRef.current.clientWidth, behavior: 'smooth' });

  const maxDots = 6;
  const [startDot, endDot] = getDotRange(carouselIndex, carouselSlides, maxDots);
  const dots = Array.from({ length: carouselSlides }, (_, i) => i).slice(startDot, endDot + 1);

  return (
    <div className={styles.page}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="breadcrumb">
        <Link href="/">На головну
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActive}>Під замовлення</span>
      </nav>

      {/* Heading */}
      <h1 className={styles.pageTitle}>Замовляйте зараз індивідуальні меблі</h1>
      <p className={styles.pageSubtitle}>
        Обирайте базові параметри для Ваших майбутніх меблів і наш менеджер зв&apos;яжеться з Вами для уточнення деталей
      </p>

      {formState?.success ? (
        <div className={styles.successMessage}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F45145" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Дякуємо! Вашу заявку прийнято. Ми зв&apos;яжемося з вами найближчим часом.</span>
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="productTypes" value={selectedTypes.join(', ')} />
          <input type="hidden" name="colors"       value={selectedColors.join(', ')} />
          <input type="hidden" name="appliances"   value={selectedAppliances.join(', ')} />
          <input type="hidden" name="construction" value={construction} />

          <div className={styles.formColumns}>
            {/* ── Left: contact ── */}
            <div className={styles.contactColumn}>
              <h2 className={styles.columnTitle}>Контактні дані</h2>
              <input name="lastName"   type="text" placeholder="Прізвище *"           className={styles.input} required disabled={pending} />
              <input name="firstName"  type="text" placeholder="Ім'я *"               className={styles.input} required disabled={pending} />
              <input name="patronymic" type="text" placeholder="По батькові"           className={styles.input} disabled={pending} />
              <input name="phone"      type="tel"  placeholder="+380 Номер телефону *" className={styles.input} required disabled={pending} />
              <input name="email"      type="email" placeholder="E-mail"              className={styles.input} disabled={pending} />
              <input name="region" type="text" placeholder="Область: Почніть вводити назву *" className={styles.input} required disabled={pending} />
              <input name="city"   type="text" placeholder="Місто: Почніть вводити назву *"   className={styles.input} required disabled={pending} />
              <label className={styles.gdprLabel}>
                <input type="checkbox" name="gdpr" className={styles.gdprCheckbox} required disabled={pending} />
                <span>
                  Я даю згоду на обробку персональних даних відповідно до{' '}
                  <Link href="/privacy-policy" target="_blank" className={styles.gdprLink}>Політики конфіденційності</Link>.
                </span>
              </label>
            </div>

            {/* ── Right: config ── */}
            <div className={styles.configColumn}>

              {/* Product type */}
              <div className={styles.configBlock}>
                <div className={styles.blockTitleRow}>
                  <h2 className={styles.blockTitle}>Вид виробу:</h2>
                </div>
                <div className={styles.checkboxGrid3}>
                  {PRODUCT_TYPES.map((t) => (
                    <label key={t} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(t)}
                        onChange={() => toggleType(t)}
                        className={styles.checkbox}
                        disabled={pending}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Kitchen materials dropdowns */}
              <div className={styles.configBlock}>
                <div className={styles.blockTitleRow}>
                  <h2 className={styles.blockTitle}>Матеріали:</h2>
                  <span className={styles.kitchenOnlyTag}>Для кухонь</span>
                </div>
                <div className={styles.selectRow}>
                  <select name="corpus" className={styles.select} disabled={pending || !isKitchen} defaultValue="">
                    <option value="" disabled>Корпус</option>
                    <option value="ldsp">ЛДСП</option>
                    <option value="mdf">МДФ</option>
                    <option value="solid">Масив дерева</option>
                  </select>
                  <select name="worktop" className={styles.select} disabled={pending || !isKitchen} defaultValue="">
                    <option value="" disabled>Робоча поверхня</option>
                    <option value="ldsp">ЛДСП</option>
                    <option value="stone">Камінь</option>
                    <option value="acrylic">Акрил</option>
                  </select>
                  <select name="fittings" className={styles.select} disabled={pending || !isKitchen} defaultValue="">
                    <option value="" disabled>Фурнітура</option>
                    <option value="blum">Blum</option>
                    <option value="hettich">Hettich</option>
                    <option value="grass">Grass</option>
                  </select>
                </div>
              </div>

              {/* Colors */}
              <div className={styles.configBlock}>
                <div className={styles.blockTitleRow}>
                  <h2 className={styles.blockTitle}>Матеріали:</h2>
                </div>
                <div className={styles.checkboxGrid3}>
                  {COLORS.map((c) => (
                    <label key={c} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(c)}
                        onChange={() => toggleColor(c)}
                        className={styles.checkbox}
                        disabled={pending}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Construction */}
              <div className={styles.configBlock}>
                <div className={styles.blockTitleRow}>
                  <h2 className={styles.blockTitle}>Конструкція:</h2>
                </div>
                <div className={styles.checkboxGrid2}>
                  {['Розкладна', 'Нерозкладна'].map((opt) => (
                    <label key={opt} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={construction === opt}
                        onChange={() => setConstruction(prev => prev === opt ? '' : opt)}
                        className={styles.checkbox}
                        disabled={pending}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Built-in appliances (kitchen only) */}
              <div className={styles.configBlock}>
                <div className={styles.blockTitleRow}>
                  <h2 className={`${styles.blockTitle} ${!isKitchen ? styles.kitchenOnlyTag : ''}`}>Вбудовані прилади:</h2>
                  <span className={styles.kitchenOnlyTag}>Для кухонь</span>
                </div>
                <div className={styles.checkboxGrid2}>
                  {APPLIANCES.map((a) => (
                    <label key={a} className={`${styles.checkboxLabel} ${!isKitchen ? styles.disabled : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedAppliances.includes(a)}
                        onChange={() => isKitchen && toggleAppliance(a)}
                        className={styles.checkbox}
                        disabled={pending || !isKitchen}
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className={styles.configBlock}>
                {showComment ? (
                  <textarea
                    name="comment"
                    placeholder="Ваш коментар..."
                    className={styles.textarea}
                    rows={3}
                    disabled={pending}
                  />
                ) : (
                  <button type="button" className={styles.addCommentBtn} onClick={() => setShowComment(true)}>
                    Додати коментар +
                  </button>
                )}
              </div>
            </div>
          </div>

          {formState?.error && <p className={styles.formError}>{formState.error}</p>}

          <div className={styles.submitRow}>
            <button type="submit" className={styles.submitBtn} disabled={pending}>
              {pending ? 'Надсилання...' : (
                <>
                  НАДІСЛАТИ ЗАПИТ НА ЗАМОВЛЕННЯ
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m2 7 10 7 10-7"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── Suggestions ── */}
      {suggestions.length > 0 && (
        <section className={styles.suggestionsSection} aria-label="Пропозиції для Вас">
          <h2 className={styles.sectionTitle}>Пропозиції для Вас</h2>
          <p className={styles.sectionSubtitle}>Ці товари можуть Вас зацікавити</p>

          <div className={styles.carouselWrapper}>
            <div className={styles.carouselContainer} ref={carouselRef}>
              {suggestions.map((product) => (
                <div key={product.id} className={styles.carouselSlide}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div className={styles.scrollButtons}>
              <button className={styles.arrowScrollButton} onClick={scrollLeft} aria-label="Попередній">
                <svg width="34" height="24" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.6663 7H1.33301M1.33301 7L9.33301 13M1.33301 7L9.33301 1" stroke="#160101" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className={styles.dotsContainer}>
                {dots.map((i) => (
                  <div
                    key={i}
                    className={i === carouselIndex ? `${styles.dot} ${styles.activeDot}` : styles.dot}
                    onClick={() => scrollTo(i)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
              <button className={styles.arrowScrollButton} onClick={scrollRight} aria-label="Наступний">
                <svg width="34" height="24" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.33301 7H22.6663M22.6663 7L14.6663 1M22.6663 7L14.6663 13" stroke="#160101" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
