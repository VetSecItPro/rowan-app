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

    // Wrap analytics computation in cache (15 minute TTL for expensive queries)
    const analytics = await withCache(
      ADMIN_CACHE_KEYS.analytics(timeRange),
      async () => {
        // Calculate date ranges
        const now = new Date();
        let startDate: Date;

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

        // Fetch comprehensive analytics data in parallel
        const [
          betaRequestsResult,
          launchNotificationsResult,
          usersResult,
          betaUsersResult,
          // Feature events for traffic analytics
          featureEventsResult,
          featureEventsTotalResult,
          deviceBreakdownResult,
          browserBreakdownResult,
          topPagesResult,
          hourlyActivityResult,
        ] = await Promise.allSettled([
          // Beta requests over time (using admin client to bypass RLS)
          supabaseAdmin
            .from('beta_access_requests')
            .select('created_at, access_granted')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true }),

          // Launch notifications over time
          supabaseAdmin
            .from('launch_notifications')
            .select('created_at, source')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true }),

          // User registrations over time (from beta users)
          supabaseAdmin
            .from('beta_access_requests')
            .select('approved_at, user_id')
            .not('user_id', 'is', null)
            .gte('approved_at', startDate.toISOString())
            .order('approved_at', { ascending: true }),

          // Current beta user activity
          supabaseAdmin
            .from('beta_access_requests')
            .select('user_id, email, created_at, approved_at')
            .eq('access_granted', true)
            .not('user_id', 'is', null),

          // Feature events for page view tracking
          supabaseAdmin
            .from('feature_events')
            .select('feature, action, device_type, browser, os, session_id, created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true }),

          // Total feature events count (all time)
          supabaseAdmin
            .from('feature_events')
            .select('*', { count: 'exact', head: true }),

          // Device type breakdown
          supabaseAdmin
            .from('feature_events')
            .select('device_type')
            .gte('created_at', startDate.toISOString())
            .not('device_type', 'is', null),

          // Browser breakdown
          supabaseAdmin
            .from('feature_events')
            .select('browser, os')
            .gte('created_at', startDate.toISOString())
            .not('browser', 'is', null),

          // Top pages (features)
          supabaseAdmin
            .from('feature_events')
            .select('feature')
            .eq('action', 'page_view')
            .gte('created_at', startDate.toISOString()),

          // Hourly activity pattern
          supabaseAdmin
            .from('feature_events')
            .select('created_at')
            .gte('created_at', startDate.toISOString()),
        ]);

        // Process beta requests data
        const betaRequests = betaRequestsResult.status === 'fulfilled' ? (betaRequestsResult.value.data || []) : [];
        const launchNotifications = launchNotificationsResult.status === 'fulfilled' ? (launchNotificationsResult.value.data || []) : [];
        const userRegistrations = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : [];
        const betaUsers = betaUsersResult.status === 'fulfilled' ? (betaUsersResult.value.data || []) : [];

        // Process feature events data
        const featureEvents = featureEventsResult.status === 'fulfilled' ? (featureEventsResult.value.data || []) : [];
        const totalEventsAllTime = featureEventsTotalResult.status === 'fulfilled' ? (featureEventsTotalResult.value.count || 0) : 0;
        const deviceEvents = deviceBreakdownResult.status === 'fulfilled' ? (deviceBreakdownResult.value.data || []) : [];
        const browserEvents = browserBreakdownResult.status === 'fulfilled' ? (browserBreakdownResult.value.data || []) : [];
        const pageViewEvents = topPagesResult.status === 'fulfilled' ? (topPagesResult.value.data || []) : [];
        const hourlyEvents = hourlyActivityResult.status === 'fulfilled' ? (hourlyActivityResult.value.data || []) : [];

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

        // Device breakdown
        const deviceCounts: Record<string, number> = {};
        deviceEvents.forEach((e: { device_type: string }) => {
          const device = e.device_type || 'unknown';
          deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });
        const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
          device: device.charAt(0).toUpperCase() + device.slice(1),
          count,
          percentage: deviceEvents.length > 0 ? Math.round((count / deviceEvents.length) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        // Browser breakdown
        const browserCounts: Record<string, number> = {};
        browserEvents.forEach((e: { browser: string }) => {
          const browser = e.browser || 'unknown';
          browserCounts[browser] = (browserCounts[browser] || 0) + 1;
        });
        const browserBreakdown = Object.entries(browserCounts).map(([browser, count]) => ({
          browser: browser.charAt(0).toUpperCase() + browser.slice(1),
          count,
          percentage: browserEvents.length > 0 ? Math.round((count / browserEvents.length) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        // OS breakdown
        const osCounts: Record<string, number> = {};
        browserEvents.forEach((e: { os: string }) => {
          const os = e.os || 'unknown';
          osCounts[os] = (osCounts[os] || 0) + 1;
        });
        const osBreakdown = Object.entries(osCounts).map(([os, count]) => ({
          os: os.charAt(0).toUpperCase() + os.slice(1),
          count,
          percentage: browserEvents.length > 0 ? Math.round((count / browserEvents.length) * 100) : 0,
        })).sort((a, b) => b.count - a.count);

        // Top pages
        const pageCounts: Record<string, number> = {};
        pageViewEvents.forEach((e: { feature: string }) => {
          const page = e.feature || 'unknown';
          pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        const topPages = Object.entries(pageCounts).map(([page, views]) => ({
          page: page.charAt(0).toUpperCase() + page.slice(1),
          views,
          percentage: pageViewEvents.length > 0 ? Math.round((views / pageViewEvents.length) * 100) : 0,
        })).sort((a, b) => b.views - a.views).slice(0, 10);

        // Hourly activity pattern (0-23 hours)
        const hourlyActivity: number[] = new Array(24).fill(0);
        hourlyEvents.forEach((e: { created_at: string }) => {
          const hour = new Date(e.created_at).getHours();
          hourlyActivity[hour]++;
        });

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

          // Count events for this day
          const betaRequestsCount = betaRequests.filter((req: { created_at: string }) =>
            req.created_at.startsWith(dateStr)
          ).length;

          const launchNotificationsCount = launchNotifications.filter((notif: { created_at: string }) =>
            notif.created_at.startsWith(dateStr)
          ).length;

          const userRegistrationsCount = userRegistrations.filter((user: { approved_at?: string | null }) =>
            user.approved_at && user.approved_at.startsWith(dateStr)
          ).length;

          // Page views for this day
          const pageViewsCount = dailyPageViews[dateStr] || 0;

          dailyData.push({
            date: dateStr,
            betaRequests: betaRequestsCount,
            launchNotifications: launchNotificationsCount,
            userRegistrations: userRegistrationsCount,
            pageViews: pageViewsCount,
          });
        }

            // Calculate success metrics
        const totalBetaRequests = betaRequests.length;
        const approvedBetaRequests = betaRequests.filter((req: { access_granted?: boolean }) => req.access_granted).length;
        const totalLaunchNotifications = launchNotifications.length;
        const totalUserRegistrations = userRegistrations.length;

        // Beta program status (100 users limit)
        const betaCapacity = 100;
        const activeBetaUsers = betaUsers.length;
        const capacityUsage = Math.round((activeBetaUsers / betaCapacity) * 100);

        // Source distribution for launch notifications
        const sourceDistribution = launchNotifications.reduce((acc: Record<string, number>, notif: { source?: string }) => {
          const source = notif.source || 'direct';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Conversion rates
        const betaApprovalRate = totalBetaRequests > 0 ? Math.round((approvedBetaRequests / totalBetaRequests) * 100) : 0;
        const betaSignupRate = approvedBetaRequests > 0 ? Math.round((totalUserRegistrations / approvedBetaRequests) * 100) : 0;

        // Growth rates (comparing first half vs second half of period)
        const midPoint = Math.floor(days / 2);
        const firstHalfBetaRequests = dailyData.slice(0, midPoint).reduce((sum, day) => sum + day.betaRequests, 0);
        const secondHalfBetaRequests = dailyData.slice(midPoint).reduce((sum, day) => sum + day.betaRequests, 0);
        const betaGrowthRate = firstHalfBetaRequests > 0
          ? Math.round(((secondHalfBetaRequests - firstHalfBetaRequests) / firstHalfBetaRequests) * 100)
          : 0;

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
            betaUsers: day.betaRequests,
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
          betaMetrics: {
            conversionRate: betaSignupRate,
            approvalRate: betaApprovalRate,
            retentionRate: activeBetaUsers > 0 ? Math.min(100, (activeBetaUsers / betaCapacity) * 100) : 0,
            averageActivityScore: activeBetaUsers > 0 ? Math.min(10, (activeBetaUsers / 30) * 10) : 0,
          },
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
            activity: day.betaRequests + day.launchNotifications + day.userRegistrations + day.pageViews,
          })),
          summary: {
            totalUsers: totalUserRegistrations,
            totalNotifications: totalLaunchNotifications,
            totalBetaRequests: totalBetaRequests,
            activeBetaUsers: activeBetaUsers,
            growthRate: betaGrowthRate,
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
              totalBetaRequests,
              approvedBetaRequests,
              totalLaunchNotifications,
              totalUserRegistrations,
              activeBetaUsers,
              capacityUsage,
              betaApprovalRate,
              betaSignupRate,
              betaGrowthRate,
              notificationGrowthRate,
            },
          },
          lastUpdated: new Date().toISOString(),
        };

        return analytics;
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