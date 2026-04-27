import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Public liveness probe for uptime monitors (UptimeRobot, Pingdom, etc.).
 *
 * Intentionally minimal — no DB query, no auth, no rate limit. Just
 * confirms the Next.js runtime is responsive. For deeper system health
 * (DB connectivity, error counts, memory), use /api/admin/health.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
