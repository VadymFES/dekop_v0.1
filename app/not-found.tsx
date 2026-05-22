import Link from 'next/link';
import { redis } from '@/app/lib/redis';
import styles from './not-found.module.css';

export default async function NotFound() {
  try {
    const bucket = Math.floor(Date.now() / 60000);
    const key = `errors:4xx:minute:${bucket}`;
    await redis.incr(key);
    await redis.expire(key, 3600);
  } catch {}

  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Сторінку не знайдено</h1>
      <p className={styles.body}>Можливо, сторінку було переміщено або видалено.</p>
      <Link href="/" className={styles.link}>На головну</Link>
    </main>
  );
}
