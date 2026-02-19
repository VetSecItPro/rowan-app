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

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data for admin dashboard
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

      // Validate session data and check expiration
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

    // Get query parameters for time range
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d'; // 7d, 30d, 90d
    const forceRefresh = searchParams.get('refresh') === 'true';
    const compareEnabled = searchParams.get('compare') === 'true';

    // Wrap analytics computation in cache (15 minute TTL for expensive queries)
    const cacheKey = compareEnabled
      ? `${ADMIN_CACHE_KEYS.analytics(timeRange)}:compare`
      : ADMIN_CACHE_KEYS.analytics(timeRange);

    const analytics = await withCache(
      cacheKey,
      async () => {
        // Calculate date ranges
        const now = new Date();
        let startDate: Date;
        const rangeDays = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7;

        switch (timeRange) {
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default: // 7d
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Previous period dates (e.g., if range=30d, previous = day 31-60 ago)
        const previousEnd = new Date(startDate.getTime());
        const previousStart = new Date(startDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        // Fetch comprehensive analytics data in parallel
        // PERF-DB-006: Removed 4 redundant feature_events queries (device, browser,
        // top pages, hourly). All breakdowns are derived from the main featureEvents result.
        const [
          launchNotificationsResult,
          usersResult,
          featureEventsResult,
          featureEventsTotalResult,
        ] = await Promise.allSettled([
          // Launch notifications over time
          supabaseAdmin
            .from('launch_notifications')
            .select('created_at, source')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(10000),

          // User registrations over time
          supabaseAdmin
            .from('users')
            .select('created_at, id')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(10000),

          // Feature events for page view tracking + all breakdowns
          supabaseAdmin
            .from('feature_events')
            .select('feature, action, device_type, browser, os, session_id, created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(50000),

          // Total feature events count (all time)
          supabaseAdmin
            .from('feature_events')
            .select('*', { count: 'exact', head: true }),
        ]);

        // Process results
        const launchNotifications = launchNotificationsResult.status === 'fulfilled' ? (launchNotificationsResult.value.data || []) : [];
        const userRegistrations = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : [];

        // Process feature events data — all breakdowns derived from this single query
        const featureEvents = featureEventsResult.status === 'fulfilled' ? (featureEventsResult.value.data || []) : [];
        const totalEventsAllTime = featureEventsTotalResult.status === 'fulfilled' ? (featureEventsTotalResult.value.count || 0) : 0;

        // Define type for feature events
        type FeatureEvent = {
          feature: string;
          action: string;
          device_type: string | null;
          browser: string | null;
          os: string | null;
          session_id: string | null;
          created_at: string;
        };

        // Calculate traffic metrics
        const totalPageViews = featureEvents.filter((e: FeatureEvent) => e.action === 'page_view').length;
        const uniqueSessions = new Set(featureEvents.map((e: FeatureEvent) => e.session_id).filter(Boolean)).size;
        // For unique users, we count by session since feature_events doesn't have user_id in this query
        const uniqueUsers = uniqueSessions;

        // Derive device, browser, OS, page, and hourly breakdowns from featureEvents
        // (PERF-DB-006: single query instead of 4 separate ones)
        const deviceCounts: Record<string, number> = {};
        const browserCounts: Record<string, number> = {};
        const osCounts: Record<string, number> = {};
        const pageCounts: Record<string, number> = {};
        const hourlyActivity: number[] = new Array(24).fill(0);
        let deviceEventsCount = 0;
        let browserEventsCount = 0;
        let pageViewEventsCount = 0;

        featureEvents.forEach((e: FeatureEvent) => {
          // Device breakdown (only for events with device_type)
          if (e.device_type) {
            const device = e.device_type;
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
            deviceEventsCount++;
          }

          // Browser + OS breakdown (only for events with browser)
          if (e.browser) {
            browserCounts[e.browser] = (browserCounts[e.browser] || 0) + 1;
            browserEventsCount++;
            const os = e.os || 'unknown';
            osCounts[os] = (osCounts[os] || 0) + 1;
          }

          // Top pages (page_view actions only)
          if (e.action === 'page_view') {
            const page = e.feature || 'unknown';
            pageCounts[page] = (pageCounts[page] || 0) + 1;
            pageViewEventsCount++;
          }

          // Hourly activity
          const hour = new Date(e.created_at).getHours();
          hourlyActivity[hour]++;
        });

        const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
          device: device.charAt(0).toUpperCase() + device.slice(1),
          count,
          percentage: deviceEventsCount > 0 ? Math.round((count / deviceEventsCount) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        const browserBreakdown = Object.entries(browserCounts).map(([browser, count]) => ({
          browser: browser.charAt(0).toUpperCase() + browser.slice(1),
          count,
          percentage: browserEventsCount > 0 ? Math.round((count / browserEventsCount) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        const osBreakdown = Object.entries(osCounts).map(([os, count]) => ({
          os: os.charAt(0).toUpperCase() + os.slice(1),
          count,
          percentage: browserEventsCount > 0 ? Math.round((count / browserEventsCount) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        const topPages = Object.entries(pageCounts).map(([page, views]) => ({
          page: page.charAt(0).toUpperCase() + page.slice(1),
          views,
          percentage: pageViewEventsCount > 0 ? Math.round((views / pageViewEventsCount) * 100) : 0,
        })).sort((a, b) => b.views - a.views).slice(0, 10);

        // Daily page views for chart
        const dailyPageViews: Record<string, number> = {};
        featureEvents.forEach((e: { action: string; created_at: string }) => {
          if (e.action === 'page_view') {
            const dateStr = e.created_at.split('T')[0];
            dailyPageViews[dateStr] = (dailyPageViews[dateStr] || 0) + 1;
          }
        });

        // Generate daily data points for line charts
        const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyData = [];

        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];

          const launchNotificationsCount = launchNotifications.filter((notif: { created_at: string }) =>
            notif.created_at.startsWith(dateStr)
          ).length;

          const userRegistrationsCount = userRegistrations.filter((user: { created_at: string }) =>
            user.created_at.startsWith(dateStr)
          ).length;

          // Page views for this day
          const pageViewsCount = dailyPageViews[dateStr] || 0;

          dailyData.push({
            date: dateStr,
            launchNotifications: launchNotificationsCount,
            userRegistrations: userRegistrationsCount,
            pageViews: pageViewsCount,
          });
        }

        // Calculate success metrics
        const totalLaunchNotifications = launchNotifications.length;
        const totalUserRegistrations = userRegistrations.length;

        // Source distribution for launch notifications
        const sourceDistribution = launchNotifications.reduce((acc: Record<string, number>, notif: { source?: string }) => {
          const source = notif.source || 'direct';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Growth rates (comparing first half vs second half of period)
        const midPoint = Math.floor(days / 2);

        const firstHalfNotifications = dailyData.slice(0, midPoint).reduce((sum, day) => sum + day.launchNotifications, 0);
        const secondHalfNotifications = dailyData.slice(midPoint).reduce((sum, day) => sum + day.launchNotifications, 0);
        const notificationGrowthRate = firstHalfNotifications > 0
          ? Math.round(((secondHalfNotifications - firstHalfNotifications) / firstHalfNotifications) * 100)
          : 0;

        // Compile analytics response in the format expected by the frontend
        const analytics = {
          userGrowth: dailyData.map(day => ({
            date: day.date,
            users: day.userRegistrations,
          })),
          signupTrends: dailyData.map(day => ({
            date: day.date,
            signups: day.userRegistrations,
            notifications: day.launchNotifications,
          })),
          // Traffic analytics (page views over time)
          trafficTrends: dailyData.map(day => ({
            date: day.date,
            pageViews: day.pageViews,
          })),
          // Traffic metrics
          trafficMetrics: {
            totalPageViews,
            totalEventsAllTime,
            uniqueSessions,
            uniqueUsers,
            avgPagesPerSession: uniqueSessions > 0 ? Math.round((totalPageViews / uniqueSessions) * 10) / 10 : 0,
          },
          // Breakdowns
          deviceBreakdown,
          browserBreakdown,
          osBreakdown,
          topPages,
          hourlyActivity,
          sourceDistribution: Object.entries(sourceDistribution).map(([source, count]) => ({
            source: source.charAt(0).toUpperCase() + source.slice(1),
            count: count as number,
            percentage: totalLaunchNotifications > 0 ? ((count as number / totalLaunchNotifications) * 100) : 0,
          })),
          activityHeatmap: dailyData.map(day => ({
            hour: new Date(day.date).getDay(), // Use day of week as hour for simplification
            day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
            activity: day.launchNotifications + day.userRegistrations + day.pageViews,
          })),
          summary: {
            totalUsers: totalUserRegistrations,
            totalNotifications: totalLaunchNotifications,
            growthRate: notificationGrowthRate,
            churnRate: 0, // Calculate churn rate when we have retention data
            // Traffic summary
            totalPageViews,
            uniqueVisitors: uniqueSessions,
          },
          // Keep the original format for other consumers
          _legacy: {
            timeRange,
            period: {
              startDate: startDate.toISOString(),
              endDate: now.toISOString(),
              days,
            },
            dailyData,
            summary: {
              totalLaunchNotifications,
              totalUserRegistrations,
              notificationGrowthRate,
            },
          },
          lastUpdated: new Date().toISOString(),
        };

        // Compute previous period data if comparison is enabled
        let previousPeriod = undefined;
        if (compareEnabled) {
          const [
            prevFeatureEventsResult,
            prevUsersResult,
            prevLaunchResult,
          ] = await Promise.allSettled([
            supabaseAdmin
              .from('feature_events')
              .select('action, created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', previousEnd.toISOString())
              .limit(50000),
            supabaseAdmin
              .from('users')
              .select('created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', previousEnd.toISOString())
              .limit(10000),
            supabaseAdmin
              .from('launch_notifications')
              .select('created_at')
              .gte('created_at', previousStart.toISOString())
              .lt('created_at', previousEnd.toISOString())
              .limit(10000),
          ]);

          const prevFeatureEvents = prevFeatureEventsResult.status === 'fulfilled' ? (prevFeatureEventsResult.value.data || []) : [];
          const prevUsers = prevUsersResult.status === 'fulfilled' ? (prevUsersResult.value.data || []) : [];
          const prevLaunch = prevLaunchResult.status === 'fulfilled' ? (prevLaunchResult.value.data || []) : [];

          const prevTotalPageViews = prevFeatureEvents.filter((e: { action: string }) => e.action === 'page_view').length;

          // Daily page views for previous period
          const prevDailyPageViews: Record<string, number> = {};
          prevFeatureEvents.forEach((e: { action: string; created_at: string }) => {
            if (e.action === 'page_view') {
              const dateStr = e.created_at.split('T')[0];
              prevDailyPageViews[dateStr] = (prevDailyPageViews[dateStr] || 0) + 1;
            }
          });

          // Generate daily data for previous period (same number of days)
          const prevDailyData = [];
          for (let i = 0; i < days; i++) {
            const date = new Date(previousStart.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const prevLaunchCount = prevLaunch.filter((n: { created_at: string }) =>
              n.created_at.startsWith(dateStr)
            ).length;
            const prevUserCount = prevUsers.filter((u: { created_at: string }) =>
              u.created_at.startsWith(dateStr)
            ).length;

            prevDailyData.push({
              date: dateStr,
              pageViews: prevDailyPageViews[dateStr] || 0,
              userRegistrations: prevUserCount,
              launchNotifications: prevLaunchCount,
            });
          }

          previousPeriod = {
            trafficTrends: prevDailyData.map(day => ({
              date: day.date,
              pageViews: day.pageViews,
            })),
            userGrowth: prevDailyData.map(day => ({
              date: day.date,
              users: day.userRegistrations,
            })),
            summary: {
              totalPageViews: prevTotalPageViews,
              totalUsers: prevUsers.length,
              totalNotifications: prevLaunch.length,
            },
          };
        }

        return { ...analytics, previousPeriod };
      },
      { ttl: ADMIN_CACHE_TTL.analytics, skipCache: forceRefresh }
    );

    // Log admin access

    return NextResponse.json({
      success: true,
      analytics,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/analytics',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/analytics GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}