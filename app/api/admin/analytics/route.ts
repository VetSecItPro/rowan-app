import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto';

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
    const cookieStore = cookies();
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
      sessionData = decryptSessionData(adminSession.value);

      // Validate session data and check expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Admin session decryption failed:', error);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Get query parameters for time range
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d'; // 7d, 30d, 90d

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
    ] = await Promise.allSettled([
      // Beta requests over time
      supabase
        .from('beta_access_requests')
        .select('created_at, access_granted')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),

      // Launch notifications over time
      supabase
        .from('launch_notifications')
        .select('created_at, source')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),

      // User registrations over time (from beta users)
      supabase
        .from('beta_access_requests')
        .select('approved_at, user_id')
        .not('user_id', 'is', null)
        .gte('approved_at', startDate.toISOString())
        .order('approved_at', { ascending: true }),

      // Current beta user activity
      supabase
        .from('beta_access_requests')
        .select('user_id, email, created_at, approved_at')
        .eq('access_granted', true)
        .not('user_id', 'is', null),
    ]);

    // Process beta requests data
    const betaRequests = betaRequestsResult.status === 'fulfilled' ? (betaRequestsResult.value.data || []) : [];
    const launchNotifications = launchNotificationsResult.status === 'fulfilled' ? (launchNotificationsResult.value.data || []) : [];
    const userRegistrations = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : [];
    const betaUsers = betaUsersResult.status === 'fulfilled' ? (betaUsersResult.value.data || []) : [];

    // Generate daily data points for line charts
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyData = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Count events for this day
      const betaRequestsCount = betaRequests.filter((req: any) =>
        req.created_at.startsWith(dateStr)
      ).length;

      const launchNotificationsCount = launchNotifications.filter((notif: any) =>
        notif.created_at.startsWith(dateStr)
      ).length;

      const userRegistrationsCount = userRegistrations.filter((user: any) =>
        user.approved_at && user.approved_at.startsWith(dateStr)
      ).length;

      dailyData.push({
        date: dateStr,
        betaRequests: betaRequestsCount,
        launchNotifications: launchNotificationsCount,
        userRegistrations: userRegistrationsCount,
      });
    }

    // Calculate success metrics
    const totalBetaRequests = betaRequests.length;
    const approvedBetaRequests = betaRequests.filter((req: any) => req.access_granted).length;
    const totalLaunchNotifications = launchNotifications.length;
    const totalUserRegistrations = userRegistrations.length;

    // Beta program status
    const betaCapacity = 30;
    const activeBetaUsers = betaUsers.length;
    const capacityUsage = Math.round((activeBetaUsers / betaCapacity) * 100);

    // Source distribution for launch notifications
    const sourceDistribution = launchNotifications.reduce((acc: any, notif: any) => {
      const source = notif.source || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

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
      betaMetrics: {
        conversionRate: betaSignupRate,
        approvalRate: betaApprovalRate,
        retentionRate: activeBetaUsers > 0 ? Math.min(100, (activeBetaUsers / betaCapacity) * 100) : 0,
        averageActivityScore: activeBetaUsers > 0 ? Math.min(10, (activeBetaUsers / 30) * 10) : 0,
      },
      sourceDistribution: Object.entries(sourceDistribution).map(([source, count]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        count: count as number,
        percentage: totalLaunchNotifications > 0 ? ((count as number / totalLaunchNotifications) * 100) : 0,
      })),
      activityHeatmap: dailyData.map(day => ({
        hour: new Date(day.date).getDay(), // Use day of week as hour for simplification
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        activity: day.betaRequests + day.launchNotifications + day.userRegistrations,
      })),
      summary: {
        totalUsers: totalUserRegistrations,
        totalNotifications: totalLaunchNotifications,
        totalBetaRequests: totalBetaRequests,
        activeBetaUsers: activeBetaUsers,
        growthRate: betaGrowthRate,
        churnRate: 0, // Calculate churn rate when we have retention data
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

    // Log admin access
    console.log(`Admin analytics accessed by: ${sessionData.email} from IP: ${ip}, Range: ${timeRange}`);

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
    console.error('[API] /api/admin/analytics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}