/**
 * Admin AI Rate Limits — RPM/RPD monitoring endpoint
 *
 * Returns current requests-per-minute and requests-per-day counters
 * from the in-memory API request tracker. Used by the admin dashboard
 * for real-time rate limit visibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getApiRequestStats } from '@/lib/services/ai/chat-orchestrator-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  const stats = getApiRequestStats();
  return NextResponse.json(stats);
}
