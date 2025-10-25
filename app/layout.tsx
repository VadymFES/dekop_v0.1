// app/layout.tsx
import type { Metadata } from "next";
import QueryProvider from "@/app/providers/QueryProvider";
import ClientLayout from "./ClientLayout";
import "./globals.css";
import { CartProvider } from "./context/CartContext";


export const metadata: Metadata = {
  title: "Dekop Furniture Enterprise - меблі для вашого дому",
  description: "Сучасні меблі для дому: дивани, стільці, столи, шафи, ліжка та матраци. Якісні меблі з доставкою по Україні від Dekop Furniture Enterprise.",
  keywords: "меблі, дивани, стільці, столи, шафи, ліжка, матраци, меблі для дому, купити меблі, Dekop",
  authors: [{ name: "Dekop Furniture Enterprise" }],
  creator: "Dekop Furniture Enterprise",
  publisher: "Dekop Furniture Enterprise",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },
  openGraph: {
    title: "Dekop Furniture Enterprise - меблі для вашого дому",
    description: "Сучасні меблі для дому: дивани, стільці, столи, шафи, ліжка та матраци. Якісні меблі з доставкою по Україні.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "Dekop Furniture Enterprise",
    images: [
      {
        url: `/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Dekop Furniture Enterprise - меблі для вашого дому",
      }
    ],
    locale: "uk_UA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dekop Furniture Enterprise - меблі для вашого дому",
    description: "Сучасні меблі для дому: дивани, стільці, столи, шафи, ліжка та матраци.",
    images: [`/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <QueryProvider>
          <CartProvider>
          <ClientLayout>{children}</ClientLayout>
          </CartProvider>
        </QueryProvider>
      </body>
    </html>
  );
}