// TEMPORARY — delete after testing
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.ip
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const blocked = await redis.get(`blocked:${ip}`);
  return NextResponse.json({
    ip,
    blocked,
    redis_url: process.env.UPSTASH_REDIS_REST_URL?.replace(/\/\/.*@/, '//***@') ?? 'not set',
  });
}
