'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './contacts.module.css';

const PHONE = '+38 (098) 220 85 69';
const PHONE_HREF = 'tel:+380982208569';
const EMAIL = 'info@decop.com.ua';
const ADDRESS = "об'їзна м. Костопіль, с. мала Любаша вул. Кленова 1, м. Костопіль, Рівненська область, Україна, 35000";

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/meblidekor4you/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=100093951543078',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: '#',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 2L11 13"/>
        <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
      </svg>
    ),
  },
];

const SUBJECT_OPTIONS = [
  'Виберіть тему повідомлення',
  'Консультація з вибору меблів',
  'Замовлення та оплата',
  'Доставка та збирання',
  'Повернення або обмін',
  'Співпраця та оптові замовлення',
  'Інше',
];

type FormState = {
  name: string;
  contact: string;
  subject: string;
  message: string;
};

export default function ContactsContent() {
  const [form, setForm] = useState<FormState>({
    name: '',
    contact: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="breadcrumb">
        <Link href="/">Головна</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActive}>Контакти</span>
      </nav>

      {/* ── Main two-column layout ── */}
      <div className={styles.mainGrid}>

        {/* ── LEFT: Info column ── */}
        <div className={styles.infoColumn}>
          <h1 className={styles.pageTitle}>Контакти</h1>
          <p className={styles.pageSubtitle}>
            Маєте питання щодо вибору меблів, умов доставки чи замовлення? Наші
            консультанти допоможуть підібрати оптимальне рішення для вашого
            інтер&apos;єру. Зверніться зручним для вас способом — відповімо
            швидко та по суті.
          </p>

          {/* Legal info */}
          <div className={styles.legalBlock}>
            <h2 className={styles.legalTitle}>Юридична інформація:</h2>
            <p className={styles.legalText}>Dekop Furniture Enterprise</p>
            <p className={styles.legalText}>Ідентифікаційний код: 12345678</p>
            <p className={styles.legalText}>
              Адреса: 35000, Україна, Рівненська обл., м. Костопіль,
              с. мала Любаша, вул. Кленова, 1
            </p>
          </div>

          {/* Contact details */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <div>
                <p className={styles.detailLabel}>Телефон</p>
                <a href={PHONE_HREF} className={styles.detailValue}>{PHONE}</a>
              </div>
            </div>

            <div className={styles.detailItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m2 7 10 7 10-7"/>
              </svg>
              <div>
                <p className={styles.detailLabel}>Електронна пошта</p>
                <a href={`mailto:${EMAIL}`} className={styles.detailValue}>{EMAIL}</a>
              </div>
            </div>

            <div className={styles.detailItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <div>
                <p className={styles.detailLabel}>Адреса</p>
                <span className={styles.detailText}>{ADDRESS}</span>
              </div>
            </div>

            <div className={styles.detailItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <p className={styles.detailLabel}>Графік роботи</p>
                <span className={styles.detailText}>Пн–Пт: 9:00–20:00</span>
                <span className={styles.detailText}>Сб–Нд: 10:00–18:00</span>
              </div>
            </div>
          </div>

          {/* Social icons */}
          <div className={styles.socialBlock}>
            <p className={styles.socialLabel}>Ми в соціальних мережах:</p>
            <div className={styles.socialRow}>
              {SOCIALS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href === '#' ? undefined : '_blank'}
                  rel={href === '#' ? undefined : 'noreferrer'}
                  className={styles.socialIcon}
                  aria-label={label}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Contact form card ── */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Напишіть нам</h2>
          <p className={styles.formSubtitle}>
            Заповніть форму і ми зв&apos;яжемося з вами протягом робочого дня.
          </p>

          {submitted ? (
            <div className={styles.successMessage}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--hover-color)" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <p>Дякуємо за звернення! Ми відповімо вам найближчим часом.</p>
            </div>
          ) : (
            <form className={styles.contactForm} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Ім&apos;я</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={styles.input}
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  autoComplete="given-name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="contact" className={styles.label}>
                  Ел. пошта або телефон
                </label>
                <input
                  id="contact"
                  name="contact"
                  type="text"
                  className={styles.input}
                  value={form.contact}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="subject" className={styles.label}>Тема</label>
                <select
                  id="subject"
                  name="subject"
                  className={styles.select}
                  value={form.subject}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  {SUBJECT_OPTIONS.map((opt, i) => (
                    <option key={opt} value={i === 0 ? '' : opt} disabled={i === 0}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="message" className={styles.label}>Повідомлення</label>
                <textarea
                  id="message"
                  name="message"
                  className={styles.textarea}
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  disabled={submitting}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Надсилаємо…' : 'Надіслати'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
