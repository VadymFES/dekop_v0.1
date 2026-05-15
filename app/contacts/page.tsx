import type { Metadata } from 'next';
import ContactsContent from './ContactsContent';

export const metadata: Metadata = {
  title: 'Контакти | Dekop',
  description:
    'Зв\'яжіться з нами для отримання консультації. Адреса, телефон, графік роботи та карта розташування салону-магазину Dekop.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/contacts`,
  },
  openGraph: {
    title: 'Контакти | Dekop',
    description: 'Адреса, телефон, графік роботи та карта розташування салону-магазину Dekop.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dekop.com.ua'}/contacts`,
  },
};

export default function ContactsPage() {
  return <ContactsContent />;
}
