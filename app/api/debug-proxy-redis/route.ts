// TEMPORARY — delete after testing
import { NextResponse } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${REDIS_URL}/get/maintenance_mode`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await res.json();
    return NextResponse.json({
      url_set: !!REDIS_URL,
      token_set: !!REDIS_TOKEN,
      redis_response: data,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
