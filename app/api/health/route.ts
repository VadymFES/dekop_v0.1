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
    recs.push('Database 🔴 — unreachable. Check Vercel Postgres dashboard and connection limits.');
  } else {
    if (checks.database.latency_ms > 500) {
      recs.push(`Database ⚠️ — latency ${checks.database.latency_ms}ms. Check for long-running queries or pool exhaustion.`);
    }
    if (checks.database.slow_query_pct > 10) {
      recs.push(`Database ⚠️ — ${checks.database.slow_query_pct}% slow queries. Review missing indexes (EXPLAIN ANALYZE).`);
    }
  }

  // Redis
  if (checks.redis.status === 'error') {
    recs.push('Redis 🔴 — unreachable. Rate limiting and bot blocking are offline. Check Upstash dashboard.');
  } else {
    if (checks.redis.maintenance_mode) {
      recs.push('Maintenance mode 🔧 — site is offline for users. To restore: SET maintenance_mode false in Redis.');
    }
    if (checks.redis.scraper_suspects > 20) {
      recs.push(`Scrapers 🤖 — ${checks.redis.scraper_suspects} suspects. Review: ZRANGE scraper:suspects 0 -1 WITHSCORES`);
    } else if (checks.redis.scraper_suspects > 5) {
      recs.push(`Scrapers 👀 — ${checks.redis.scraper_suspects} suspects in Redis. Monitor for increase.`);
    }
  }

  // Non-critical services
  if (checks.email.status !== 'ok') {
    recs.push('Email 📧 — not configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel env vars.');
  }
  if (checks.blob_storage.status !== 'ok') {
    recs.push('Blob storage 🗄️ — not configured. Set BLOB_READ_WRITE_TOKEN in Vercel env vars.');
  }
  if (checks.payments.liqpay.status !== 'ok') {
    recs.push('LiqPay 💳 — not configured. Set LIQPAY_PUBLIC_KEY + LIQPAY_PRIVATE_KEY in Vercel env vars.');
  }
  if (checks.payments.monobank.status !== 'ok') {
    recs.push('Monobank 💳 — not configured. Set MONOBANK_TOKEN + MONOBANK_PUBLIC_KEY in Vercel env vars.');
  }
  if (checks.bot_server.status !== 'ok') {
    recs.push('Bot server 🤖 — not configured. Set BOT_SERVER_URL + INTERNAL_SECRET in Vercel env vars.');
  }

  // Memory
  const heapPct = memory.heap_total_mb > 0
    ? Math.round((memory.heap_used_mb / memory.heap_total_mb) * 100)
    : 0;
  if (heapPct >= 90) {
    recs.push(`Memory 🔴 — heap at ${heapPct}% (${memory.heap_used_mb}/${memory.heap_total_mb} MB). Likely memory leak — redeploy immediately.`);
  } else if (heapPct >= 75) {
    recs.push(`Memory ⚠️ — heap at ${heapPct}% (${memory.heap_used_mb}/${memory.heap_total_mb} MB). Monitor closely.`);
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
