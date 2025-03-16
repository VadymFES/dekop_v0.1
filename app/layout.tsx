// app/layout.tsx
import type { Metadata } from "next";
import QueryProvider from "@/app/providers/QueryProvider";
import ClientLayout from "./ClientLayout";
import "./globals.css";
import { CartProvider } from "./context/CartContext";


export const metadata: Metadata = {
  title: "Dekop Furniture Enterprise - меблі для вашого дому",
  description: "Generated by Vadym's Next.js Starter",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "Dekop Furniture Enterprise",
    description: "Меблі для вашого дому",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/og-image.png`],
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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