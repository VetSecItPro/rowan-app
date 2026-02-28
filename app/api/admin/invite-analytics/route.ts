/**
 * Invite Analytics API Route
 * GET /api/admin/invite-analytics - Get space invitation analytics
 *
 * Provides:
 * - Total invites sent, accepted, pending, expired, cancelled
 * - Invite conversion rate (accepted / total)
 * - Daily trend of invites sent and accepted (last 30 days)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface InviteRow {
  status: string;
  created_at: string;
}

interface DailyTrendItem {
  date: string;
  sent: number;
  accepted: number;
}

interface InviteAnalytics {
  totalSent: number;
  accepted: number;
  pending: number;
  expired: number;
  cancelled: number;
  conversionRate: number;
  dailyTrend: DailyTrendItem[];
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    try {
      const sessionData = await decryptSessionData(adminSession.value);

      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const inviteAnalytics = await withCache(
      ADMIN_CACHE_KEYS.inviteAnalytics,
      async (): Promise<InviteAnalytics> => {
        // Fetch all invitations (status only for counts)
        const { data: allInvites, error: allError } = await supabaseAdmin
          .from('space_invitations')
          .select('status, created_at')
          .order('created_at', { ascending: true });

        if (allError) {
          logger.error('[API] invite-analytics query error:', allError, { component: 'api-route', action: 'api_request' });
          throw allError;
        }

        const invites: InviteRow[] = allInvites || [];

        // Count by status
        const totalSent = invites.length;
        const accepted = invites.filter(i => i.status === 'accepted').length;
        const pending = invites.filter(i => i.status === 'pending').length;
        const expired = invites.filter(i => i.status === 'expired').length;
        const cancelled = invites.filter(i => i.status === 'cancelled').length;
        const conversionRate = totalSent > 0 ? Math.round((accepted / totalSent) * 100) : 0;

        // Daily trend for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const recentInvites = invites.filter(
          i => new Date(i.created_at) >= thirtyDaysAgo
        );

        // Group by date
        const dailySent: Record<string, number> = {};
        const dailyAccepted: Record<string, number> = {};

        recentInvites.forEach(inv => {
          const dateStr = inv.created_at.split('T')[0];
          dailySent[dateStr] = (dailySent[dateStr] || 0) + 1;
          if (inv.status === 'accepted') {
            dailyAccepted[dateStr] = (dailyAccepted[dateStr] || 0) + 1;
          }
        });

        // Build full 30-day trend array
        const dailyTrend: DailyTrendItem[] = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo.getTime() + i * 86400000);
          const dateStr = date.toISOString().split('T')[0];
          dailyTrend.push({
            date: dateStr,
            sent: dailySent[dateStr] || 0,
            accepted: dailyAccepted[dateStr] || 0,
          });
        }

        return {
          totalSent,
          accepted,
          pending,
          expired,
          cancelled,
          conversionRate,
          dailyTrend,
        };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      inviteAnalytics,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/invite-analytics',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/invite-analytics GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch invite analytics data' },
      { status: 500 }
    );
  }
}
