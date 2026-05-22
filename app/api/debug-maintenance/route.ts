// TEMPORARY — delete after testing
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const maintenance = await redis.get('maintenance_mode');
  return NextResponse.json({ ip, maintenance_mode: maintenance });
}
