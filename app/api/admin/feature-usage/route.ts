/**
 * Admin Feature Usage Analytics API
 *
 * Provides detailed analytics on which features users are interacting with.
 *
 * GET /api/admin/feature-usage?range=7d|30d|90d
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface FeatureUsageSummary {
  feature: string;
  displayName: string;
  pageViews: number;
  uniqueUsers: number;
  totalActions: number;
  avgDailyUsers: number;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

interface DailyFeatureData {
  date: string;
  features: Record<string, {
    pageViews: number;
    uniqueUsers: number;
    actions: number;
  }>;
}

// Feature display names
const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  calendar: 'Calendar',
  reminders: 'Reminders',
  shopping: 'Shopping',
  meals: 'Meals',
  recipes: 'Recipes',
  messages: 'Messages',
  goals: 'Goals',
  household: 'Household',
  projects: 'Projects',
  expenses: 'Expenses',
  rewards: 'Rewards',
  checkin: 'Check-In',
  settings: 'Settings',
};

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
    const cookieStore = await cookies();
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Calculate date range
    const now = new Date();
    let daysBack: number;

    switch (timeRange) {
      case '30d':
        daysBack = 30;
        break;
      case '90d':
        daysBack = 90;
        break;
      default:
        daysBack = 7;
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Wrap in cache
    const featureUsageData = await withCache(
      `${ADMIN_CACHE_KEYS.analytics(timeRange)}_feature_usage`,
      async () => {
        // Fetch aggregated daily data
        const { data: dailyData, error: dailyError } = await supabaseAdmin
          .from('feature_usage_daily')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (dailyError) {
          logger.error('Error fetching daily feature usage:', dailyError, { component: 'api-route', action: 'api_request' });
          throw dailyError;
        }

        // Fetch raw events for detailed breakdown (last 7 days only for performance)
        const recentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { data: recentEvents, error: eventsError } = await supabaseAdmin
          .from('feature_events')
          .select('feature, action, device_type, created_at')
          .gte('created_at', recentStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(10000);

        if (eventsError) {
          logger.error('Error fetching feature events:', eventsError, { component: 'api-route', action: 'api_request' });
          // Don't throw - we can still return daily data
        }

        // Process daily data into summary by feature
        const featureSummaries: Record<string, FeatureUsageSummary> = {};
        const dailyByDate: Record<string, Record<string, {
          pageViews: number;
          uniqueUsers: number;
          actions: number;
        }>> = {};

        // Initialize all features
        Object.keys(FEATURE_DISPLAY_NAMES).forEach((feature) => {
          featureSummaries[feature] = {
            feature,
            displayName: FEATURE_DISPLAY_NAMES[feature],
            pageViews: 0,
            uniqueUsers: 0,
            totalActions: 0,
            avgDailyUsers: 0,
            trend: 0,
            trendDirection: 'neutral',
            deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
            topActions: [],
          };
        });

        // Aggregate daily data
        if (dailyData) {
          for (const day of dailyData) {
            const dateStr = day.date;

            if (!dailyByDate[dateStr]) {
              dailyByDate[dateStr] = {};
            }

            const feature = day.feature;
            if (featureSummaries[feature]) {
              featureSummaries[feature].pageViews += day.page_views || 0;
              featureSummaries[feature].uniqueUsers += day.unique_users || 0;
              featureSummaries[feature].totalActions += day.total_actions || 0;
              featureSummaries[feature].deviceBreakdown.mobile += day.device_mobile || 0;
              featureSummaries[feature].deviceBreakdown.desktop += day.device_desktop || 0;
              featureSummaries[feature].deviceBreakdown.tablet += day.device_tablet || 0;

              dailyByDate[dateStr][feature] = {
                pageViews: day.page_views || 0,
                uniqueUsers: day.unique_users || 0,
                actions: day.total_actions || 0,
              };
            }
          }
        }

        // Calculate averages and trends
        const midPoint = Math.floor(daysBack / 2);
        const dates = Object.keys(dailyByDate).sort();
        const firstHalfDates = dates.slice(0, midPoint);
        const secondHalfDates = dates.slice(midPoint);

        Object.keys(featureSummaries).forEach((feature) => {
          const summary = featureSummaries[feature];

          // Average daily users
          const daysWithData = dates.filter(
            (d) => dailyByDate[d]?.[feature]?.uniqueUsers > 0
          ).length;
          summary.avgDailyUsers = daysWithData > 0
            ? Math.round((summary.uniqueUsers / daysWithData) * 10) / 10
            : 0;

          // Calculate trend
          const firstHalfUsers = firstHalfDates.reduce(
            (sum, d) => sum + (dailyByDate[d]?.[feature]?.uniqueUsers || 0),
            0
          );
          const secondHalfUsers = secondHalfDates.reduce(
            (sum, d) => sum + (dailyByDate[d]?.[feature]?.uniqueUsers || 0),
            0
          );

          if (firstHalfUsers > 0) {
            summary.trend = Math.round(
              ((secondHalfUsers - firstHalfUsers) / firstHalfUsers) * 100
            );
          } else if (secondHalfUsers > 0) {
            summary.trend = 100;
          }

          summary.trendDirection =
            summary.trend > 5 ? 'up' : summary.trend < -5 ? 'down' : 'neutral';
        });

        // Calculate top actions from recent events
        if (recentEvents) {
          const actionCounts: Record<string, Record<string, number>> = {};

          for (const event of recentEvents) {
            if (!actionCounts[event.feature]) {
              actionCounts[event.feature] = {};
            }
            if (event.action !== 'page_view') {
              actionCounts[event.feature][event.action] =
                (actionCounts[event.feature][event.action] || 0) + 1;
            }
          }

          Object.keys(actionCounts).forEach((feature) => {
            if (featureSummaries[feature]) {
              featureSummaries[feature].topActions = Object.entries(
                actionCounts[feature]
              )
                .map(([action, count]) => ({ action, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            }
          });
        }

        // Convert to sorted array
        const summaryArray = Object.values(featureSummaries)
          .filter((s) => s.pageViews > 0 || s.totalActions > 0)
          .sort((a, b) => b.uniqueUsers - a.uniqueUsers);

        // Generate daily chart data
        const chartData: DailyFeatureData[] = dates.map((date) => ({
          date,
          features: dailyByDate[date] || {},
        }));

        // Calculate totals
        const totals = {
          totalPageViews: summaryArray.reduce((sum, s) => sum + s.pageViews, 0),
          totalUniqueUsers: summaryArray.reduce((sum, s) => sum + s.uniqueUsers, 0),
          totalActions: summaryArray.reduce((sum, s) => sum + s.totalActions, 0),
          deviceBreakdown: {
            mobile: summaryArray.reduce((sum, s) => sum + s.deviceBreakdown.mobile, 0),
            desktop: summaryArray.reduce((sum, s) => sum + s.deviceBreakdown.desktop, 0),
            tablet: summaryArray.reduce((sum, s) => sum + s.deviceBreakdown.tablet, 0),
          },
        };

        return {
          timeRange,
          period: {
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            days: daysBack,
          },
          summary: summaryArray,
          dailyData: chartData,
          totals,
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      data: featureUsageData,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/feature-usage',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/feature-usage GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch feature usage data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-usage/aggregate
 * Manually trigger aggregation of feature events into daily summaries
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get optional date parameter
    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Call aggregation function
    const { error: aggregateError } = await supabaseAdmin.rpc(
      'aggregate_feature_usage_daily',
      { target_date: targetDate }
    );

    if (aggregateError) {
      logger.error('Aggregation error:', aggregateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Aggregation failed', details: aggregateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully aggregated feature usage for ${targetDate}`,
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('[API] /api/admin/feature-usage POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to aggregate data' },
      { status: 500 }
    );
  }
}
