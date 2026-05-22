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
  const memory = {
    rss_mb:        Math.round(mem.rss / 1024 / 1024),
    heap_used_mb:  Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
  };

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      uptime_s: Math.floor(process.uptime()),
      checks,
      memory,
      recommendations: buildRecommendations(checks, memory),
    },
    { status: status === 'unhealthy' ? 503 : 200 },
  );
}

type Memory = { rss_mb: number; heap_used_mb: number; heap_total_mb: number };

function buildRecommendations(checks: any, memory: Memory): string[] {
  const recs: string[] = [];

  // Database
  if (checks.database.status === 'error') {
    recs.push('🔴 DB unreachable — check Vercel Postgres dashboard and connection limits');
  } else {
    if (checks.database.latency_ms > 500) {
      recs.push(`⚠️ DB latency is ${checks.database.latency_ms}ms — check for long-running queries or connection pool exhaustion`);
    }
    if (checks.database.slow_query_pct > 10) {
      recs.push(`⚠️ ${checks.database.slow_query_pct}% slow queries — review missing indexes (run EXPLAIN ANALYZE on slow endpoints)`);
    }
  }

  // Redis
  if (checks.redis.status === 'error') {
    recs.push('🔴 Redis unreachable — check Upstash dashboard; rate limiting and bot blocking are offline');
  } else {
    if (checks.redis.maintenance_mode) {
      recs.push('🔧 Site is in maintenance mode — to restore: redis SET maintenance_mode false');
    }
    if (checks.redis.scraper_suspects > 20) {
      recs.push(`🤖 ${checks.redis.scraper_suspects} scraper suspects detected — review via: ZRANGE scraper:suspects 0 -1 WITHSCORES`);
    } else if (checks.redis.scraper_suspects > 5) {
      recs.push(`👀 ${checks.redis.scraper_suspects} scraper suspects in Redis — monitor for increase`);
    }
  }

  // Non-critical services
  if (checks.email.status !== 'ok') {
    recs.push('📧 Email not configured — set RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel env vars');
  }
  if (checks.blob_storage.status !== 'ok') {
    recs.push('🗄️ Blob storage not configured — set BLOB_READ_WRITE_TOKEN in Vercel env vars');
  }
  if (checks.payments.liqpay.status !== 'ok') {
    recs.push('💳 LiqPay not configured — set LIQPAY_PUBLIC_KEY + LIQPAY_PRIVATE_KEY in Vercel env vars');
  }
  if (checks.payments.monobank.status !== 'ok') {
    recs.push('💳 Monobank not configured — set MONOBANK_TOKEN + MONOBANK_PUBLIC_KEY in Vercel env vars');
  }
  if (checks.bot_server.status !== 'ok') {
    recs.push('🤖 Bot server not configured — set BOT_SERVER_URL + INTERNAL_SECRET in Vercel env vars');
  }

  // Memory
  const heapPct = memory.heap_total_mb > 0
    ? Math.round((memory.heap_used_mb / memory.heap_total_mb) * 100)
    : 0;
  if (heapPct >= 90) {
    recs.push(`🔴 Heap at ${heapPct}% (${memory.heap_used_mb}/${memory.heap_total_mb} MB) — likely memory leak, redeploy immediately`);
  } else if (heapPct >= 75) {
    recs.push(`⚠️ Heap at ${heapPct}% (${memory.heap_used_mb}/${memory.heap_total_mb} MB) — monitor closely`);
  }

  return recs;
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
