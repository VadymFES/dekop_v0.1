import Script from 'next/script';
import styles from './GoogleTagManager.module.css';


interface GoogleTagManagerProps {
  gtmId: string;
  nonce: string;
}

/**
 * Google Tag Manager component that complies with strict CSP
 * Uses external script loading without inline JavaScript
 */
export default function GoogleTagManager({ gtmId, nonce }: GoogleTagManagerProps) {
  return (
    <>
      {/* GTM Script - loads externally to comply with CSP */}
      <Script
        nonce={nonce}
        id="gtm-script"
        src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}&l=dataLayer`}
        strategy="afterInteractive"
      />

      {/* GTM noscript iframe */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          className={styles.gtmNoscriptIframe}
        />
      </noscript>
    </>
  );
}
