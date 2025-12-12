import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/notifications/stats
 * Get statistics for launch notifications
 */
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
    const cookieStore = safeCookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);

      // Validate session data structure and expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Invalid or expired session' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Get date ranges
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all statistics in parallel
    const [
      totalResult,
      subscribedResult,
      unsubscribedResult,
      todaySignupsResult,
      weekSignupsResult,
      sourcesResult,
    ] = await Promise.allSettled([
      // Total notifications
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true }),

      // Subscribed count
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', true),

      // Unsubscribed count
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', false),

      // Today's signups
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),

      // This week's signups
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${weekAgo}T00:00:00.000Z`),

      // Source breakdown
      supabase
        .from('launch_notifications')
        .select('source')
        .eq('subscribed', true),
    ]);

    // Extract counts safely
    const total = totalResult.status === 'fulfilled' ? (totalResult.value.count || 0) : 0;
    const subscribed = subscribedResult.status === 'fulfilled' ? (subscribedResult.value.count || 0) : 0;
    const unsubscribed = unsubscribedResult.status === 'fulfilled' ? (unsubscribedResult.value.count || 0) : 0;
    const todaySignups = todaySignupsResult.status === 'fulfilled' ? (todaySignupsResult.value.count || 0) : 0;
    const thisWeekSignups = weekSignupsResult.status === 'fulfilled' ? (weekSignupsResult.value.count || 0) : 0;

    // Process sources
    let topSources: Array<{ source: string; count: number }> = [];
    if (sourcesResult.status === 'fulfilled' && sourcesResult.value.data) {
      const sourceCounts: { [key: string]: number } = {};
      sourcesResult.value.data.forEach((item: any) => {
        const source = item.source || 'homepage';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 sources
    }

    // Calculate growth trends
    const growthRate = thisWeekSignups > 0 ?
      Math.round(((todaySignups / (thisWeekSignups / 7)) - 1) * 100) : 0;

    // Compile statistics
    const stats = {
      total,
      subscribed,
      unsubscribed,
      todaySignups,
      thisWeekSignups,
      topSources,
      metrics: {
        subscriptionRate: total > 0 ? Math.round((subscribed / total) * 100) : 0,
        unsubscribeRate: total > 0 ? Math.round((unsubscribed / total) * 100) : 0,
        weeklyGrowthRate: growthRate,
        averageDailySignups: Math.round(thisWeekSignups / 7),
      },
      lastUpdated: new Date().toISOString(),
    };

    // Log any errors for debugging
    [totalResult, subscribedResult, unsubscribedResult, todaySignupsResult, weekSignupsResult, sourcesResult]
      .forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Notification stat query ${index} failed:`, result.reason);
        }
      });

    // Log admin access

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/notifications/stats',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/notifications/stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
      { status: 500 }
    );
  }
}