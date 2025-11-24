import Script from 'next/script';

interface GoogleTagManagerProps {
  gtmId: string;
}

/**
 * Google Tag Manager component that complies with strict CSP
 * Uses external script loading without inline JavaScript
 */
export default function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  return (
    <>
      {/* GTM Script - loads externally to comply with CSP */}
      <Script
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
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
