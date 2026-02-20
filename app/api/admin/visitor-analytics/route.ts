/**
 * Visitor Analytics API Route
 * GET /api/admin/visitor-analytics - Get site visit analytics and metrics
 *
 * Provides:
 * - Unique visitors and total page views
 * - Pages per visit ratio
 * - Top pages, referrers, UTM sources
 * - Device and country breakdowns
 * - Daily visitor/pageview trends
 * - Signup conversion rate
 * - Period-over-period comparison
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

interface TopPage {
  path: string;
  views: number;
  uniqueVisitors: number;
}

interface BreakdownItem {
  count: number;
  percentage: number;
}

interface ReferrerItem extends BreakdownItem {
  referrer: string;
}

interface UtmSourceItem extends BreakdownItem {
  source: string;
}

interface DeviceItem extends BreakdownItem {
  type: string;
}

interface CountryItem extends BreakdownItem {
  country: string;
}

interface DailyTrendItem {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
}

interface PreviousPeriod {
  uniqueVisitors: number;
  totalPageViews: number;
  totalSignups: number;
  dailyTrend: DailyTrendItem[];
}

interface VisitorAnalytics {
  uniqueVisitors: number;
  totalPageViews: number;
  pagesPerVisit: number;
  topPages: TopPage[];
  topReferrers: ReferrerItem[];
  topUtmSources: UtmSourceItem[];
  deviceBreakdown: DeviceItem[];
  countryBreakdown: CountryItem[];
  dailyTrend: DailyTrendItem[];
  signupConversionRate: number;
  totalSignups: number;
  previousPeriod?: PreviousPeriod;
  lastUpdated: string;
}

interface SiteVisitRow {
  visitor_hash: string;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  device_type: string | null;
  country: string | null;
  created_at: string;
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

    // Wrap visitor analytics computation in cache
    const cacheKey = compareEnabled
      ? `${ADMIN_CACHE_KEYS.visitorAnalytics(range)}:compare`
      : ADMIN_CACHE_KEYS.visitorAnalytics(range);

    const visitorAnalytics = await withCache(
      cacheKey,
      async (): Promise<VisitorAnalytics> => {
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

        // Previous period start (same duration, immediately before current period)
        const periodMs = now.getTime() - startDate.getTime();
        const previousStart = new Date(startDate.getTime() - periodMs);

        // Fetch data in parallel
        const [visitsResult, signupsResult] = await Promise.allSettled([
          // Site visits in current period
          supabaseAdmin
            .from('site_visits')
            .select('visitor_hash, path, referrer, utm_source, device_type, country, created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(50000),

          // User signups in current period
          supabaseAdmin
            .from('users')
            .select('id, created_at')
            .gte('created_at', startDate.toISOString())
            .limit(10000),
        ]);

        // Extract results
        const visits: SiteVisitRow[] = visitsResult.status === 'fulfilled'
          ? (visitsResult.value.data || [])
          : [];
        const signups = signupsResult.status === 'fulfilled'
          ? (signupsResult.value.data || [])
          : [];

        // --- Compute aggregations ---

        // Unique visitors and total page views
        const visitorSet = new Set(visits.map(v => v.visitor_hash));
        const uniqueVisitors = visitorSet.size;
        const totalPageViews = visits.length;
        const pagesPerVisit = uniqueVisitors > 0
          ? Math.round((totalPageViews / uniqueVisitors) * 100) / 100
          : 0;

        // Top pages
        const pageCounts: Record<string, { views: number; visitors: Set<string> }> = {};
        visits.forEach(v => {
          const path = v.path || '/';
          if (!pageCounts[path]) {
            pageCounts[path] = { views: 0, visitors: new Set() };
          }
          pageCounts[path].views++;
          pageCounts[path].visitors.add(v.visitor_hash);
        });

        const topPages: TopPage[] = Object.entries(pageCounts)
          .map(([path, data]) => ({
            path,
            views: data.views,
            uniqueVisitors: data.visitors.size,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);

        // Top referrers
        const referrerCounts: Record<string, number> = {};
        visits.forEach(v => {
          const referrer = normalizeReferrer(v.referrer);
          referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
        });

        const topReferrers: ReferrerItem[] = Object.entries(referrerCounts)
          .map(([referrer, count]) => ({
            referrer,
            count,
            percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Top UTM sources
        const utmCounts: Record<string, number> = {};
        visits.forEach(v => {
          const source = v.utm_source || 'none';
          utmCounts[source] = (utmCounts[source] || 0) + 1;
        });

        const topUtmSources: UtmSourceItem[] = Object.entries(utmCounts)
          .map(([source, count]) => ({
            source,
            count,
            percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Device breakdown
        const deviceCounts: Record<string, number> = {};
        visits.forEach(v => {
          const deviceType = v.device_type || 'unknown';
          deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
        });

        const deviceBreakdown: DeviceItem[] = Object.entries(deviceCounts)
          .map(([type, count]) => ({
            type,
            count,
            percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        // Country breakdown
        const countryCounts: Record<string, number> = {};
        visits.forEach(v => {
          const country = v.country || 'Unknown';
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        });

        const countryBreakdown: CountryItem[] = Object.entries(countryCounts)
          .map(([country, count]) => ({
            country,
            count,
            percentage: totalPageViews > 0 ? Math.round((count / totalPageViews) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Daily trend
        const days = Math.ceil(periodMs / (1000 * 60 * 60 * 24));
        const dailyVisitors: Record<string, Set<string>> = {};
        const dailyPageViews: Record<string, number> = {};

        visits.forEach(v => {
          const dateStr = v.created_at.split('T')[0];
          if (!dailyVisitors[dateStr]) {
            dailyVisitors[dateStr] = new Set();
          }
          dailyVisitors[dateStr].add(v.visitor_hash);
          dailyPageViews[dateStr] = (dailyPageViews[dateStr] || 0) + 1;
        });

        const dailyTrend: DailyTrendItem[] = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          dailyTrend.push({
            date: dateStr,
            uniqueVisitors: dailyVisitors[dateStr]?.size || 0,
            pageViews: dailyPageViews[dateStr] || 0,
          });
        }

        // Signup conversion rate
        const totalSignups = signups.length;
        const signupConversionRate = uniqueVisitors > 0
          ? Math.round((totalSignups / uniqueVisitors) * 10000) / 100
          : 0;

        // Previous period comparison
        let previousPeriod: PreviousPeriod | undefined = undefined;
        if (compareEnabled) {
          const [prevVisitsResult, prevSignupsResult] = await Promise.allSettled([
            supabaseAdmin
              .from('site_visits')
              .select('visitor_hash, created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', startDate.toISOString())
              .order('created_at', { ascending: true })
              .limit(50000),
            supabaseAdmin
              .from('users')
              .select('id, created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', startDate.toISOString())
              .limit(10000),
          ]);

          const prevVisits = prevVisitsResult.status === 'fulfilled'
            ? (prevVisitsResult.value.data || []) as { visitor_hash: string; created_at: string }[]
            : [];
          const prevSignups = prevSignupsResult.status === 'fulfilled'
            ? (prevSignupsResult.value.data || [])
            : [];

          const prevVisitorSet = new Set(prevVisits.map(v => v.visitor_hash));

          // Previous daily trend
          const prevDailyVisitors: Record<string, Set<string>> = {};
          const prevDailyPageViews: Record<string, number> = {};

          prevVisits.forEach(v => {
            const dateStr = v.created_at.split('T')[0];
            if (!prevDailyVisitors[dateStr]) {
              prevDailyVisitors[dateStr] = new Set();
            }
            prevDailyVisitors[dateStr].add(v.visitor_hash);
            prevDailyPageViews[dateStr] = (prevDailyPageViews[dateStr] || 0) + 1;
          });

          const prevDailyTrend: DailyTrendItem[] = [];
          for (let i = 0; i < days; i++) {
            const date = new Date(previousStart.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            prevDailyTrend.push({
              date: dateStr,
              uniqueVisitors: prevDailyVisitors[dateStr]?.size || 0,
              pageViews: prevDailyPageViews[dateStr] || 0,
            });
          }

          previousPeriod = {
            uniqueVisitors: prevVisitorSet.size,
            totalPageViews: prevVisits.length,
            totalSignups: prevSignups.length,
            dailyTrend: prevDailyTrend,
          };
        }

        return {
          uniqueVisitors,
          totalPageViews,
          pagesPerVisit,
          topPages,
          topReferrers,
          topUtmSources,
          deviceBreakdown,
          countryBreakdown,
          dailyTrend,
          signupConversionRate,
          totalSignups,
          previousPeriod,
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      visitorAnalytics,
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
        endpoint: '/api/admin/visitor-analytics',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/visitor-analytics GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch visitor analytics data' },
      { status: 500 }
    );
  }
}

// Helper: normalize referrer to hostname or "Direct"
function normalizeReferrer(referrer: string | null): string {
  if (!referrer || referrer.trim() === '') return 'Direct';

  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    // Not a valid URL, return as-is
    return referrer;
  }
}
