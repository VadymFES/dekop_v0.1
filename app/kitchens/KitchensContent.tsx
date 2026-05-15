'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useActionState } from 'react';
import styles from './kitchens.module.css';
import { submitKitchenOrder } from './actions';


interface DbCard    { id: number; name: string; description: string; price: number; image_url: string }
interface DbGallery { id: number; image_url: string; alt: string }

interface KitchensContentProps {
  dbCards:   DbCard[];
  dbGallery: DbGallery[];
}

const COLORS = [
  'Білий', 'Коричневий', 'Жовтий',
  'Сірий', 'Синій', 'Рожевий',
  'Чорний', 'Зелений', 'Інше',
  'Бежевий', 'Червоний',
];

const APPLIANCES = [
  'Духова шафа', 'Мікрохвильова піч',
  'Посудомийна машина', 'Витяжка', 'TВ', 'Холодильник', 'Плита', 'Кавоварка', 'Інше'
];

const GALLERY_COUNT = 16;


function getDotRange(current: number, total: number, max: number): [number, number] {
  if (total <= max) return [0, total - 1];
  const half = Math.floor(max / 2);
  let start = current - half;
  let end = start + (max - 1);
  if (start < 0) { start = 0; end = max - 1; }
  if (end >= total) { end = total - 1; start = end - (max - 1); }
  return [start, end];
}

export default function KitchensContent({ dbCards, dbGallery }: KitchensContentProps) {
  const products = dbCards;
  const galleryImages = dbGallery;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselSlides, setCarouselSlides] = useState(1);

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);
  const [showComment, setShowComment] = useState(false);

  const [formState, formAction, pending] = useActionState(submitKitchenOrder, null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
    setCarouselIndex(idx);
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
    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, handleScroll]);

  const scrollLeft = () =>
    carouselRef.current?.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
  const scrollRight = () =>
    carouselRef.current?.scrollBy({ left: carouselRef.current.clientWidth, behavior: 'smooth' });
  const scrollToIndex = (i: number) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollTo({ left: i * carouselRef.current.clientWidth, behavior: 'smooth' });
  };

  const maxDots = 6;
  const [startDot, endDot] = getDotRange(carouselIndex, carouselSlides, maxDots);
  const dots = Array.from({ length: carouselSlides }, (_, i) => i).slice(startDot, endDot + 1);

  const toggleColor = (c: string) =>
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleAppliance = (a: string) =>
    setSelectedAppliances(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  return (
    <div className={styles.page}>

      {/* ═══ Products ═══ */}
      <section className={styles.productsSection}>
        <div className={styles.breadcrumbs}>
          <Link href="/">На головну</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link href="/catalog">Каталог</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbActive}>Кухні</span>
        </div>

        <h1 className={styles.pageTitle}>Кухні</h1>
        <p className={styles.pageSubtitle}>
          Ми виготовляємо кухні за індивідуальними замовленнями, щоб відповідати вашим унікальним побажанням
        </p>
        <p className={styles.carouselDisclaimer}>
          *Представлені кухні — лише приклади виконаних робіт. Вони не є товарами у продажу, але ви можете замовити схожу кухню за індивідуальними параметрами.
        </p>
        <div className={styles.carouselContainer} ref={carouselRef}>
          {products.map((p) => (
            <div className={styles.kitchenCard} key={p.id}>
              {p.image_url ? (
                <div className={styles.kitchenCardImageWrapper}>
                  <Image src={p.image_url} alt={p.name} fill style={{ objectFit: 'cover' }} sizes="280px" />
                  <button className={styles.galleryExpandBtn} aria-label="Розгорнути фото" onClick={() => setLightbox(p.image_url)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className={styles.kitchenCardImage} />
              )}
              <div className={styles.kitchenCardBody}>
                <p className={styles.kitchenCardName}>{p.name}</p>
                <p className={styles.kitchenCardDesc}>{p.description}</p>
                <p className={styles.kitchenCardPrice}>{p.price.toLocaleString('uk-UA')} грн</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.carouselNav}>
          <button className={styles.arrowBtn} onClick={scrollLeft} aria-label="Попередній">
            <svg width="34" height="24" viewBox="0 0 24 14" fill="none">
              <path d="M22.6663 7H1.33301M1.33301 7L9.33301 13M1.33301 7L9.33301 1" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={styles.dotsContainer}>
            {dots.map((i) => (
              <div
                key={i}
                className={i === carouselIndex ? `${styles.dot} ${styles.activeDot}` : styles.dot}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
          <button className={styles.arrowBtn} onClick={scrollRight} aria-label="Наступний">
            <svg width="34" height="24" viewBox="0 0 24 14" fill="none">
              <path d="M1.33301 7H22.6663M22.6663 7L14.6663 1M22.6663 7L14.6663 13" stroke="#160101" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ═══ Gallery ═══ */}
      <section className={styles.gallerySection}>
        <h2 className={styles.sectionTitle}>Галерея</h2>
        <p className={styles.sectionSubtitle}>
          Запрошуємо переглянути галерею виконаних замовлень для наших клієнтів
        </p>
        <div className={styles.galleryGrid}>
          {galleryImages.length > 0
            ? galleryImages.map((img) => (
                <div className={styles.galleryItem} key={img.id}>
                  <Image src={img.image_url} alt={img.alt || 'Кухня'} fill style={{ objectFit: 'cover' }} sizes="(max-width:768px) 50vw, 25vw" />
                  <button className={styles.galleryExpandBtn} aria-label="Розгорнути фото" onClick={() => setLightbox(img.image_url)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                </div>
              ))
            : Array.from({ length: GALLERY_COUNT }, (_, i) => (
                <div className={styles.galleryItem} key={i}>
                  <div className={styles.galleryPlaceholder} />
                </div>
              ))
          }
        </div>
      </section>

      {/* ═══ Order Form ═══ */}
      <section className={styles.orderSection}>
        <h2 className={styles.orderTitle}>Замовляйте зараз ідеальну кухню</h2>
        <p className={styles.orderSubtitle}>
          Обирайте базові параметри для Вашої майбутньої кухні і наш менеджер зв&apos;яжеться з Вами для уточнення деталей
        </p>

        {formState?.success ? (
          <div className={styles.successMessage}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F45145" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Дякуємо! Вашу заявку прийнято. Ми зв&apos;яжемося з вами найближчим часом.</span>
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="colors" value={selectedColors.join(', ')} />
            <input type="hidden" name="appliances" value={selectedAppliances.join(', ')} />

            <div className={styles.formColumns}>
              {/* Contact */}
              <div className={styles.contactColumn}>
                <h3 className={styles.columnTitle}>Контактні дані</h3>
                <input name="lastName"   type="text"  placeholder="Прізвище *"           className={styles.input} required disabled={pending} />
                <input name="firstName"  type="text"  placeholder="Ім'я *"               className={styles.input} required disabled={pending} />
                <input name="patronymic" type="text"  placeholder="По батькові"           className={styles.input} disabled={pending} />
                <input name="phone"      type="tel"   placeholder="+380 Номер телефону *" className={styles.input} required disabled={pending} />
                <input name="email"      type="email" placeholder="E-mail *"              className={styles.input} required disabled={pending} />
                <input name="region" type="text" placeholder="Область *"  className={styles.input} required disabled={pending} />
                <input name="city"   type="text" placeholder="Місто *"    className={styles.input} required disabled={pending} />
                <label className={styles.gdprLabel}>
                  <input type="checkbox" name="gdpr" className={styles.gdprCheckbox} required disabled={pending} />
                  <span>
                    Я даю згоду на обробку моїх персональних даних з метою обробки заявки на виготовлення кухні та зв&apos;язку зі мною щодо деталей замовлення, відповідно до{' '}
                    <Link href="/privacy-policy" target="_blank" className={styles.gdprLink}>Політики конфіденційності</Link>.
                  </span>
                </label>
              </div>

              {/* Config */}
              <div className={styles.configColumn}>
                <div className={styles.configBlock}>
                  <h3 className={styles.columnTitle}>Матеріали:</h3>
                  <div className={styles.selectRow}>
                    <select name="corpus" className={styles.select} disabled={pending} defaultValue="">
                      <option value="" disabled>Корпус</option>
                      <option value="ldsp">ЛДСП</option>
                      <option value="mdf">МДФ</option>
                      <option value="solid">Масив дерева</option>
                    </select>
                    <select name="worktop" className={styles.select} disabled={pending} defaultValue="">
                      <option value="" disabled>Робоча поверхня</option>
                      <option value="ldsp">ЛДСП</option>
                      <option value="stone">Камінь</option>
                      <option value="acrylic">Акрил</option>
                    </select>
                    <select name="fittings" className={styles.select} disabled={pending} defaultValue="">
                      <option value="" disabled>Фурнітура</option>
                      <option value="blum">Blum</option>
                      <option value="hettich">Hettich</option>
                      <option value="grass">Grass</option>
                    </select>
                  </div>
                </div>

                <div className={styles.configBlock}>
                  <h3 className={styles.columnTitle}>Колір:</h3>
                  <div className={styles.checkboxGrid}>
                    {COLORS.map((color) => (
                      <label key={color} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={selectedColors.includes(color)}
                          onChange={() => toggleColor(color)}
                          className={styles.checkbox}
                          disabled={pending}
                        />
                        <span>{color}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.configBlock}>
                  <h3 className={styles.columnTitle}>Вбудовані прилади:</h3>
                  <div className={styles.checkboxGrid2}>
                    {APPLIANCES.map((app) => (
                      <label key={app} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={selectedAppliances.includes(app)}
                          onChange={() => toggleAppliance(app)}
                          className={styles.checkbox}
                          disabled={pending}
                        />
                        <span>{app}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
                {pending ? 'Надсилання...' : 'Замовити'}
              </button>
            </div>
          </form>
        )}
      </section>

      {lightbox && (
        <div className={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)} aria-label="Закрити">×</button>
          <img // eslint-disable-line @next/next/no-img-element
            src={lightbox}
            alt="Кухня"
            className={styles.lightboxImage}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
