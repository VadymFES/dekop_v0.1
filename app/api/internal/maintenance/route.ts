import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function isAuthorized(req: NextRequest) {
  const key = req.headers.get('x-internal-key');
  return key && key === process.env.INTERNAL_SECRET;
}

// GET — current maintenance state
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const value = await redis.get<string>('maintenance_mode');
  return NextResponse.json({ maintenance: value === 'true' });
}

// POST — toggle maintenance mode
// Body: { "enable": true } or { "enable": false }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let enable: boolean;
  try {
    const body = await req.json();
    if (typeof body.enable !== 'boolean') {
      return NextResponse.json({ error: 'Body must be { "enable": true|false }' }, { status: 400 });
    }
    enable = body.enable;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (enable) {
    await redis.set('maintenance_mode', 'true');
  } else {
    await redis.del('maintenance_mode');
  }

  return NextResponse.json({
    maintenance: enable,
    message: enable ? 'Site is now offline' : 'Site is back online',
  });
}
