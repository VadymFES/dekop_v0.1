import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { db } from '@/app/lib/db';
import { logger } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest) {
  const bypass = req.headers.get('x-vercel-protection-bypass')
    ?? req.nextUrl.searchParams.get('x-vercel-protection-bypass');
  if (!bypass || bypass !== process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [dbResult, redisResult] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
  ]);

  const checks = {
    database:
      dbResult.status === 'fulfilled'
        ? dbResult.value
        : { status: 'error' as const, error: String(dbResult.reason) },
    redis:
      redisResult.status === 'fulfilled'
        ? redisResult.value
        : { status: 'error' as const, error: String(redisResult.reason) },
    email:        checkEnv(['RESEND_API_KEY', 'RESEND_FROM_EMAIL']),
    blob_storage: checkEnv(['BLOB_READ_WRITE_TOKEN']),
    payments: {
      liqpay:   checkEnv(['LIQPAY_PUBLIC_KEY', 'LIQPAY_PRIVATE_KEY']),
      monobank: checkEnv(['MONOBANK_TOKEN', 'MONOBANK_PUBLIC_KEY']),
    },
    bot_server: checkEnv(['BOT_SERVER_URL', 'INTERNAL_SECRET']),
  };

  const criticalFailing =
    checks.database.status !== 'ok' || checks.redis.status !== 'ok';
  const nonCriticalFailing =
    checks.email.status !== 'ok' ||
    checks.blob_storage.status !== 'ok' ||
    checks.payments.liqpay.status !== 'ok' ||
    checks.payments.monobank.status !== 'ok' ||
    checks.bot_server.status !== 'ok';

  const status: 'healthy' | 'degraded' | 'unhealthy' = criticalFailing
    ? 'unhealthy'
    : nonCriticalFailing
    ? 'degraded'
    : 'healthy';

  if (status !== 'healthy') {
    logger.warn('Health check non-healthy', { status, path: '/api/health' });
  }

  const mem = process.memoryUsage();
  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      uptime_s: Math.floor(process.uptime()),
      checks,
      memory: {
        rss_mb:        Math.round(mem.rss / 1024 / 1024),
        heap_used_mb:  Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
    { status: status === 'unhealthy' ? 503 : 200 },
  );
}

async function checkDatabase() {
  const start = Date.now();
  await db.query`SELECT 1`;
  const { totalQueries, slowQueries, slowQueryPercentage } = db.getStats();
  return {
    status: 'ok' as const,
    latency_ms: Date.now() - start,
    total_queries: totalQueries,
    slow_queries: slowQueries,
    slow_query_pct: Math.round(slowQueryPercentage * 10) / 10,
  };
}

async function checkRedis() {
  const start = Date.now();
  await redis.ping();
  const latency_ms = Date.now() - start;
  const [maintenance, suspects] = await Promise.all([
    redis.get<string>('maintenance_mode'),
    redis.zcard('scraper:suspects'),
  ]);
  return {
    status: 'ok' as const,
    latency_ms,
    maintenance_mode: maintenance === 'true',
    scraper_suspects: suspects ?? 0,
  };
}

function checkEnv(keys: string[]) {
  const configured = keys.every(k => Boolean(process.env[k]));
  return {
    status: configured ? ('ok' as const) : ('missing_config' as const),
    configured,
  };
}
