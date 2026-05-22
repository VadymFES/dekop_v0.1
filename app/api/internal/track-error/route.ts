import { NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const bucket = Math.floor(Date.now() / 60000);
    const key = `errors:5xx:minute:${bucket}`;
    await redis.incr(key);
    await redis.expire(key, 3600);
  } catch {}
  return NextResponse.json({ ok: true });
}
