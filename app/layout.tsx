import type { Metadata } from "next";
import { headers } from "next/headers";
import { getNonce } from "@/app/lib/csp";
import QueryProvider from "@/app/providers/QueryProvider";
import ClientLayout from "./ClientLayout";
import "./global.css";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import GoogleTagManager from "./components/GoogleTagManager";
import CookieConsent from "./components/CookieConsent";
import { organizationSchema, websiteSchema } from "@/app/lib/schema";
import { getAdminPath } from "@/app/lib/admin-path";

export const metadata: Metadata = {
  title: {
    default: "Dekop — Меблі для вашого дому",
    template: "%s | Dekop",
  },
  description: "Інтернет-магазин меблів Dekop — дивани, ліжка, столи, шафи та аксесуари для вашого дому. Широкий вибір, доступні ціни, доставка по Україні.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dekop.com.ua"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dekop — Меблі для вашого дому",
    description: "Інтернет-магазин меблів Dekop — дивани, ліжка, столи, шафи та аксесуари для вашого дому.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://dekop.com.ua",
    siteName: "Dekop",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || "https://dekop.com.ua"}/og-image.png`],
    type: "website",
    locale: "uk_UA",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: "Dekop — Меблі для вашого дому",
    description: "Інтернет-магазин меблів Dekop — дивани, ліжка, столи, шафи та аксесуари для вашого дому.",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || "https://dekop.com.ua"}/og-image.png`],
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "16x16", type: "image/png" }],
  },
};

const GTM_ID = "GTM-TVVGC6PQ";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminPath = getAdminPath();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';
  const isAdminRoute = pathname.includes(adminPath);
  const isComingSoonRoute = pathname === '/coming-soon' || pathname.startsWith('/coming-soon/');

  const showTracking = !isAdminRoute && !isComingSoonRoute;
  const nonce = showTracking ? await getNonce() : '';

  const orgSchema = organizationSchema();
  const siteSchema = websiteSchema();

  return (
    <html lang="uk">
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify([orgSchema, siteSchema]) }}
        />
        {showTracking && (
          <>
            <script
              nonce={nonce}
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];`,
              }}
            />
            <GoogleTagManager gtmId={GTM_ID} nonce={nonce} />
          </>
        )}

        <QueryProvider>
          <CartProvider>
            <FavoritesProvider>
              <ClientLayout isAdminRoute={isAdminRoute || isComingSoonRoute}>{children}</ClientLayout>
              {showTracking && <CookieConsent />}
              {showTracking && <SpeedInsights />}
              {(showTracking || isComingSoonRoute) && <Analytics />}
            </FavoritesProvider>
          </CartProvider>
        </QueryProvider>
      </body>
    </html>
  );
}