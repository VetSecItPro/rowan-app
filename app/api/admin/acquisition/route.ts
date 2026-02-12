/**
 * Acquisition Analytics API Route
 * GET /api/admin/acquisition - Get traffic source and acquisition metrics
 *
 * Provides:
 * - Traffic source breakdown (direct, referral, social, etc.)
 * - Referrer analysis
 * - Acquisition trends over time
 * - Conversion by source
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
import { z } from 'zod';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
  refresh: z.enum(['true', 'false']).optional(),
  compare: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface SourceBreakdown {
  source: string;
  count: number;
  percentage: number;
  conversions: number;
  conversionRate: number;
}

interface ReferrerData {
  referrer: string;
  count: number;
  percentage: number;
}

interface AcquisitionMetrics {
  totalVisitors: number;
  totalSignups: number;
  overallConversionRate: number;
  sources: SourceBreakdown[];
  referrers: ReferrerData[];
  dailyTrend: { date: string; visitors: number; signups: number }[];
  topChannels: { channel: string; visitors: number; trend: number }[];
  previousPeriod?: {
    totalVisitors: number;
    totalSignups: number;
    dailyTrend: { date: string; visitors: number; signups: number }[];
  };
  lastUpdated: string;
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
    let sessionData;
    try {
      sessionData = await decryptSessionData(adminSession.value);

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

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = QueryParamsSchema.parse({
      range: searchParams.get('range') || '30d',
      refresh: searchParams.get('refresh') || undefined,
      compare: searchParams.get('compare') || undefined,
    });
    const { range } = validatedParams;
    const forceRefresh = validatedParams.refresh === 'true';
    const compareEnabled = validatedParams.compare === 'true';

    // Wrap acquisition computation in cache
    const cacheKey = compareEnabled
      ? `${ADMIN_CACHE_KEYS.acquisition(range)}:compare`
      : ADMIN_CACHE_KEYS.acquisition(range);

    const acquisition = await withCache(
      cacheKey,
      async (): Promise<AcquisitionMetrics> => {
        const now = new Date();

        // Calculate start date based on range
        let startDate: Date;
        switch (range) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default: // 30d
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Previous period for trend comparison
        const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

        // Fetch data in parallel
        const [
          launchNotificationsResult,
          previousLaunchResult,
          usersResult,
        ] = await Promise.allSettled([
          // Launch notifications (visitors who signed up for launch notification)
          supabaseAdmin
            .from('launch_notifications')
            .select('id, source, referrer, created_at, email')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(10000),

          // Previous period launch notifications for trend
          supabaseAdmin
            .from('launch_notifications')
            .select('source', { count: 'exact', head: true })
            .gte('created_at', previousStart.toISOString())
            .lt('created_at', startDate.toISOString()),

          // Users who actually signed up (conversions)
          supabaseAdmin
            .from('users')
            .select('id, created_at')
            .gte('created_at', startDate.toISOString())
            .limit(10000),
        ]);

        // Extract results
        const launchNotifications = launchNotificationsResult.status === 'fulfilled'
          ? (launchNotificationsResult.value.data || [])
          : [];
        const previousLaunchCount = previousLaunchResult.status === 'fulfilled'
          ? (previousLaunchResult.value.count || 0)
          : 0;
        const users = usersResult.status === 'fulfilled'
          ? (usersResult.value.data || [])
          : [];

        // Total visitors = launch notifications
        const totalVisitors = launchNotifications.length;
        const totalSignups = users.length;
        const overallConversionRate = totalVisitors > 0
          ? Math.round((totalSignups / totalVisitors) * 100)
          : 0;

        // Source breakdown
        const sourceCounts: Record<string, { total: number; conversions: number }> = {};

        // Process launch notifications
        launchNotifications.forEach((notif: { source: string | null; email: string }) => {
          const source = normalizeSource(notif.source);
          if (!sourceCounts[source]) {
            sourceCounts[source] = { total: 0, conversions: 0 };
          }
          sourceCounts[source].total++;
        });

        const sources: SourceBreakdown[] = Object.entries(sourceCounts)
          .map(([source, data]) => ({
            source: formatSourceLabel(source),
            count: data.total,
            percentage: totalVisitors > 0 ? Math.round((data.total / totalVisitors) * 100) : 0,
            conversions: data.conversions,
            conversionRate: data.total > 0 ? Math.round((data.conversions / data.total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);

        // Referrer breakdown
        const referrerCounts: Record<string, number> = {};
        launchNotifications.forEach((notif: { referrer: string | null }) => {
          const referrer = notif.referrer || 'Direct';
          const normalized = normalizeReferrer(referrer);
          referrerCounts[normalized] = (referrerCounts[normalized] || 0) + 1;
        });

        const totalReferrers = Object.values(referrerCounts).reduce((a, b) => a + b, 0);
        const referrers: ReferrerData[] = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({
            referrer,
            count,
            percentage: totalReferrers > 0 ? Math.round((count / totalReferrers) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 referrers

        // Daily trend
        const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyVisitors: Record<string, number> = {};
        const dailySignups: Record<string, number> = {};

        // Count visitors per day
        launchNotifications.forEach((item: { created_at: string }) => {
          const dateStr = item.created_at.split('T')[0];
          dailyVisitors[dateStr] = (dailyVisitors[dateStr] || 0) + 1;
        });

        // Count signups per day
        users.forEach((user: { created_at: string }) => {
          const dateStr = user.created_at.split('T')[0];
          dailySignups[dateStr] = (dailySignups[dateStr] || 0) + 1;
        });

        const dailyTrend: { date: string; visitors: number; signups: number }[] = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          dailyTrend.push({
            date: dateStr,
            visitors: dailyVisitors[dateStr] || 0,
            signups: dailySignups[dateStr] || 0,
          });
        }

        // Top channels with trend comparison
        const previousTotal = previousLaunchCount;
        const channelData: Record<string, number> = {};

        sources.forEach(s => {
          const channel = mapSourceToChannel(s.source);
          channelData[channel] = (channelData[channel] || 0) + s.count;
        });

        const topChannels = Object.entries(channelData)
          .map(([channel, visitors]) => ({
            channel,
            visitors,
            trend: previousTotal > 0
              ? Math.round(((visitors - (previousTotal * (visitors / totalVisitors))) / (previousTotal * (visitors / totalVisitors) || 1)) * 100)
              : 0,
          }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 5);

        // Compute previous period data if comparison is enabled
        let previousPeriod = undefined;
        if (compareEnabled) {
          const [prevLaunchDetailResult, prevUsersDetailResult] = await Promise.allSettled([
            supabaseAdmin
              .from('launch_notifications')
              .select('created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', startDate.toISOString())
              .order('created_at', { ascending: true })
              .limit(10000),
            supabaseAdmin
              .from('users')
              .select('created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', startDate.toISOString())
              .limit(10000),
          ]);

          const prevLaunch = prevLaunchDetailResult.status === 'fulfilled' ? (prevLaunchDetailResult.value.data || []) : [];
          const prevUsers = prevUsersDetailResult.status === 'fulfilled' ? (prevUsersDetailResult.value.data || []) : [];

          // Daily visitors/signups for previous period
          const prevDailyVisitors: Record<string, number> = {};
          const prevDailySignups: Record<string, number> = {};

          prevLaunch.forEach((item: { created_at: string }) => {
            const dateStr = item.created_at.split('T')[0];
            prevDailyVisitors[dateStr] = (prevDailyVisitors[dateStr] || 0) + 1;
          });
          prevUsers.forEach((user: { created_at: string }) => {
            const dateStr = user.created_at.split('T')[0];
            prevDailySignups[dateStr] = (prevDailySignups[dateStr] || 0) + 1;
          });

          const prevDailyTrend: { date: string; visitors: number; signups: number }[] = [];
          for (let i = 0; i < days; i++) {
            const date = new Date(previousStart.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            prevDailyTrend.push({
              date: dateStr,
              visitors: prevDailyVisitors[dateStr] || 0,
              signups: prevDailySignups[dateStr] || 0,
            });
          }

          previousPeriod = {
            totalVisitors: prevLaunch.length,
            totalSignups: prevUsers.length,
            dailyTrend: prevDailyTrend,
          };
        }

        return {
          totalVisitors,
          totalSignups,
          overallConversionRate,
          sources,
          referrers,
          dailyTrend,
          topChannels,
          previousPeriod,
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      acquisition,
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/acquisition',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/acquisition GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch acquisition data' },
      { status: 500 }
    );
  }
}

// Helper functions
function normalizeSource(source: string | null): string {
  if (!source) return 'direct';
  const s = source.toLowerCase().trim();

  // Map common variations
  if (s.includes('google') || s.includes('search')) return 'organic_search';
  if (s.includes('facebook') || s.includes('instagram') || s.includes('twitter') || s.includes('linkedin')) return 'social';
  if (s.includes('email') || s.includes('newsletter')) return 'email';
  if (s.includes('referral') || s.includes('friend')) return 'referral';
  if (s.includes('ad') || s.includes('paid') || s.includes('cpc')) return 'paid';
  if (s === 'direct' || s === '') return 'direct';

  return s;
}

function formatSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    direct: 'Direct',
    organic_search: 'Organic Search',
    social: 'Social Media',
    email: 'Email',
    referral: 'Referral',
    paid: 'Paid Ads',
  };
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ');
}

function normalizeReferrer(referrer: string): string {
  if (!referrer || referrer === 'Direct') return 'Direct';

  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    // If it's not a valid URL, return as-is
    return referrer;
  }
}

function mapSourceToChannel(source: string): string {
  const channelMap: Record<string, string> = {
    'Direct': 'Direct Traffic',
    'Organic Search': 'Search',
    'Social Media': 'Social',
    'Email': 'Email Marketing',
    'Referral': 'Referrals',
    'Paid Ads': 'Paid Acquisition',
  };
  return channelMap[source] || 'Other';
}
