/**
 * Admin AI Usage Realtime — Lightweight polling endpoint
 *
 * Returns just today's running cost total + active users for
 * the admin dashboard card auto-refresh (60s interval).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success } = await checkGeneralRateLimit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: rows, error } = await supabaseAdmin
      .from('ai_usage_daily')
      .select('user_id, estimated_cost_usd, input_tokens, output_tokens')
      .eq('date', today);

    if (error) {
      logger.error('[API] ai-usage/realtime query error:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json({ error: 'Failed to fetch AI usage data' }, { status: 500 });
    }

    const safeRows = rows ?? [];
    const totalCost = safeRows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
    const totalInput = safeRows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
    const totalOutput = safeRows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
    const activeUsers = new Set(safeRows.map((r) => r.user_id)).size;

    return NextResponse.json({
      today_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
      today_input_tokens: totalInput,
      today_output_tokens: totalOutput,
      active_users: activeUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/ai-usage/realtime', method: 'GET' },
    });
    logger.error('[API] /api/admin/ai-usage/realtime GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Failed to fetch AI usage data' }, { status: 500 });
  }
}
