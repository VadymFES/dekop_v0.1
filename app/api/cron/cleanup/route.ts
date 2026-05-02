import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Run cleanup functions
  const sessions = await sql`SELECT cleanup_expired_sessions()`;
  const csrf = await sql`SELECT cleanup_expired_csrf_tokens()`;
  const carts = await sql`SELECT cleanup_expired_carts()`;
  const deletions = await sql`SELECT process_scheduled_deletions()`;

  return Response.json({
    success: true,
    cleaned: {
      sessions: sessions.rows[0].cleanup_expired_sessions,
      csrf: csrf.rows[0].cleanup_expired_csrf_tokens,
      carts: carts.rows[0].cleanup_expired_carts,
      deletions: deletions.rows[0].process_scheduled_deletions,
    },
  });
}