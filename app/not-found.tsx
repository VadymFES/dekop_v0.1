import Link from 'next/link';
import { redis } from '@/app/lib/redis';

export default async function NotFound() {
  try {
    const bucket = Math.floor(Date.now() / 60000);
    const key = `errors:4xx:minute:${bucket}`;
    await redis.incr(key);
    await redis.expire(key, 3600);
  } catch {}

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif',
      background: '#faf9f7',
      color: '#160101',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <p style={{ fontSize: '5rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>404</p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>
        Сторінку не знайдено
      </h1>
      <p style={{ color: '#888', margin: '0 0 2rem', maxWidth: 360 }}>
        Можливо, сторінку було переміщено або видалено.
      </p>
      <Link href="/" style={{
        padding: '0.7rem 2rem',
        background: '#160101',
        color: '#fff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '0.95rem',
      }}>
        На головну
      </Link>
    </main>
  );
}
