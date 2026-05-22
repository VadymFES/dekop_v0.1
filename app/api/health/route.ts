import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';
import { db } from '@/app/lib/db';
import { logger } from '@/app/lib/logger';

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
      liqpay: checkEnv(['LIQPAY_PUBLIC_KEY', 'LIQPAY_PRIVATE_KEY']),
    },
    bot_server: checkEnv(['BOT_SERVER_URL', 'INTERNAL_SECRET']),
  };

  const issues: string[] = [];

  // Critical
  if (checks.database.status === 'error') {
    issues.push(`database: ${(checks.database as any).error ?? 'unreachable'}`);
  }
  if (checks.redis.status === 'error') {
    issues.push(`redis: ${(checks.redis as any).error ?? 'unreachable'}`);
  }

  // Degraded
  if (checks.email.status !== 'ok')        issues.push('email: missing_config');
  if (checks.blob_storage.status !== 'ok') issues.push('blob_storage: missing_config');
  if (checks.payments.liqpay.status !== 'ok') issues.push('payments.liqpay: missing_config');
  if (checks.bot_server.status !== 'ok')   issues.push('bot_server: missing_config');

  const criticalFailing =
    checks.database.status !== 'ok' || checks.redis.status !== 'ok';

  const status: 'healthy' | 'degraded' | 'unhealthy' = criticalFailing
    ? 'unhealthy'
    : issues.length > 0
    ? 'degraded'
    : 'healthy';

  if (status !== 'healthy') {
    logger.warn('Health check non-healthy', { status, issues, path: '/api/health' });
  }

  const mem = process.memoryUsage();
  const memory = {
    rss_mb:        Math.round(mem.rss / 1024 / 1024),
    heap_used_mb:  Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
  };

  const metrics = await readMetrics();

  return NextResponse.json(
    {
      status,
      issues,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      uptime_s: Math.floor(process.uptime()),
      checks,
      memory,
      metrics,
      recommendations: buildRecommendations(checks, memory, metrics),
    },
    { status: status === 'unhealthy' ? 503 : 200 },
  );
}

type Memory = { rss_mb: number; heap_used_mb: number; heap_total_mb: number };
type Metrics = Awaited<ReturnType<typeof readMetrics>>;

async function readMetrics() {
  const now = Math.floor(Date.now() / 60000);
  const buckets = [now, now - 1, now - 2, now - 3, now - 4];

  const sum = (vals: (string | null)[]) =>
    vals.reduce((acc, v) => acc + (parseInt(v ?? '0') || 0), 0);

  try {
    const [e4, e5, slow, traffic] = await Promise.all([
      Promise.all(buckets.map(b => redis.get<string>(`errors:4xx:minute:${b}`))),
      Promise.all(buckets.map(b => redis.get<string>(`errors:5xx:minute:${b}`))),
      Promise.all(buckets.map(b => redis.get<string>(`latency:slow:minute:${b}`))),
      Promise.all(buckets.map(b => redis.get<string>(`traffic:minute:${b}`))),
    ]);
    return {
      window_minutes: 5,
      requests:    sum(traffic),
      errors_4xx:  sum(e4),
      errors_5xx:  sum(e5),
      slow_queries: sum(slow),
    };
  } catch {
    return { window_minutes: 5, requests: 0, errors_4xx: 0, errors_5xx: 0, slow_queries: 0 };
  }
}

function buildRecommendations(checks: any, memory: Memory, metrics?: Metrics): string[] {
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

  // Error rates (last 5 min)
  if (metrics) {
    if (metrics.errors_5xx >= 10) {
      recs.push(`Errors 5xx 🔴 — ${metrics.errors_5xx} server errors in last 5m. Check logs immediately.`);
    } else if (metrics.errors_5xx >= 3) {
      recs.push(`Errors 5xx ⚠️ — ${metrics.errors_5xx} server errors in last 5m. Monitor.`);
    }
    if (metrics.errors_4xx >= 50) {
      recs.push(`Errors 4xx 👀 — ${metrics.errors_4xx} not-found hits in last 5m. Possible broken links or scan.`);
    }
    if (metrics.slow_queries >= 20) {
      recs.push(`Latency 🔴 — ${metrics.slow_queries} slow queries in last 5m. DB under stress.`);
    } else if (metrics.slow_queries >= 5) {
      recs.push(`Latency ⚠️ — ${metrics.slow_queries} slow queries in last 5m. Watch for degradation.`);
    }
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
