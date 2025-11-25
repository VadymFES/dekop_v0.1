"use client";

import { useState, useEffect } from 'react';
import styles from './CookieConsent.module.css';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'dekop_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          setPreferences(parsed.preferences);
          applyPreferences(parsed.preferences);
        } else {
          // Version changed, show banner again
          setShowBanner(true);
        }
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    // Apply analytics consent
    if (prefs.analytics) {
      // Enable Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    } else {
      // Disable Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'denied',
        });
      }
    }

    // Apply marketing consent
    if (prefs.marketing) {
      // Enable marketing cookies
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        });
      }
    } else {
      // Disable marketing cookies
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
    }
  };

  const saveConsent = async (prefs: CookiePreferences) => {
    const consentData = {
      version: COOKIE_CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));

    // Save to backend if user is logged in
    try {
      const userEmail = localStorage.getItem('user_email');
      if (userEmail) {
        await fetch('/api/gdpr/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            consents: [
              { type: 'analytics', granted: prefs.analytics },
              { type: 'marketing', granted: prefs.marketing },
              { type: 'cookies', granted: true },
            ],
            version: COOKIE_CONSENT_VERSION,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to save consent to backend:', error);
    }

    // Apply preferences
    applyPreferences(prefs);

    // Hide banner
    setShowBanner(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.banner}>
        <div className={styles.content}>
          <h2 className={styles.title}>🍪 Ми використовуємо cookie-файли</h2>

          {!showDetails ? (
            <>
              <p className={styles.description}>
                Ми використовуємо cookie-файли для покращення роботи сайту, аналізу трафіку та персоналізації контенту.
                Деякі cookie-файли є необхідними для функціонування сайту, інші допомагають нам покращувати ваш досвід.
              </p>

              <div className={styles.buttons}>
                <button
                  onClick={acceptAll}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Прийняти всі
                </button>
                <button
                  onClick={acceptNecessary}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Тільки необхідні
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className={`${styles.button} ${styles.buttonText}`}
                >
                  Налаштувати
                </button>
              </div>

              <p className={styles.legalText}>
                Використовуючи сайт, ви погоджуєтесь з нашою{' '}
                <a href="/privacy" className={styles.link}>
                  Політикою конфіденційності
                </a>
                {' '}та{' '}
                <a href="/cookies" className={styles.link}>
                  Політикою cookie
                </a>
              </p>
            </>
          ) : (
            <>
              <div className={styles.details}>
                <div className={styles.cookieCategory}>
                  <div className={styles.categoryHeader}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className={styles.checkbox}
                      />
                      <div>
                        <strong>Необхідні cookie-файли</strong>
                        <span className={styles.required}>(обов'язково)</span>
                      </div>
                    </label>
                  </div>
                  <p className={styles.categoryDescription}>
                    Ці cookie-файли необхідні для роботи сайту. Вони забезпечують базові функції,
                    такі як навігація, кошик покупок та безпека. Без них сайт не зможе працювати належним чином.
                  </p>
                  <p className={styles.examples}>
                    Приклади: cart_session, session_token, csrf_token
                  </p>
                </div>

                <div className={styles.cookieCategory}>
                  <div className={styles.categoryHeader}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) =>
                          setPreferences({ ...preferences, analytics: e.target.checked })
                        }
                        className={styles.checkbox}
                      />
                      <div>
                        <strong>Аналітичні cookie-файли</strong>
                        <span className={styles.optional}>(опціонально)</span>
                      </div>
                    </label>
                  </div>
                  <p className={styles.categoryDescription}>
                    Ці cookie-файли допомагають нам зрозуміти, як відвідувачі використовують сайт.
                    Ми використовуємо Google Analytics для збору анонімізованої статистики про відвідування,
                    щоб покращити наш сервіс.
                  </p>
                  <p className={styles.examples}>
                    Приклади: _ga, _gid, _gat (Google Analytics)
                  </p>
                </div>

                <div className={styles.cookieCategory}>
                  <div className={styles.categoryHeader}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) =>
                          setPreferences({ ...preferences, marketing: e.target.checked })
                        }
                        className={styles.checkbox}
                      />
                      <div>
                        <strong>Маркетингові cookie-файли</strong>
                        <span className={styles.optional}>(опціонально)</span>
                      </div>
                    </label>
                  </div>
                  <p className={styles.categoryDescription}>
                    Ці cookie-файли використовуються для показу релевантної реклами та відстеження ефективності
                    рекламних кампаній. Вони також допомагають обмежити кількість показів однієї реклами.
                  </p>
                  <p className={styles.examples}>
                    Приклади: fbp (Facebook Pixel), _gcl (Google Ads)
                  </p>
                </div>
              </div>

              <div className={styles.buttons}>
                <button
                  onClick={saveCustomPreferences}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Зберегти налаштування
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Назад
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Export utility functions for managing consent
export const getCookieConsent = (): CookiePreferences | null => {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    if (parsed.version === COOKIE_CONSENT_VERSION) {
      return parsed.preferences;
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const updateCookieConsent = (preferences: CookiePreferences) => {
  if (typeof window === 'undefined') return;

  const consentData = {
    version: COOKIE_CONSENT_VERSION,
    preferences,
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
};
