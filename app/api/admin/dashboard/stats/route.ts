import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics for admin panel
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

    // Verify admin authentication (checks both middleware header and cookie)
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Check for force refresh query param
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Log cache status
    logger.info('[Dashboard Stats] Request received', {
      component: 'api-route',
      data: { forceRefresh, timestamp: Date.now() }
    });

    // Fetch stats with caching (1 minute TTL)
    const stats = await withCache(
      ADMIN_CACHE_KEYS.dashboardStats,
      async () => {
        // Get current date for today's stats
        const today = new Date().toISOString().split('T')[0];

        // Fetch auth users (source of truth for real user count)
        const authUsersResult = await supabaseAdmin.auth.admin.listUsers();
        const authUsers = authUsersResult.data?.users || [];
        const totalUsers = authUsers.length;

        // Calculate active users (logged in within last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeUsers = authUsers.filter(user => {
          const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
          return lastSignIn && lastSignIn > thirtyDaysAgo;
        }).length;

        // Fetch other statistics in parallel
        const [
          betaUsersResult,
          launchSignupsResult,
          betaRequestsTodayResult,
          signupsTodayResult,
        ] = await Promise.allSettled([
          // Beta users (approved beta access requests with user_id)
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true)
            .not('user_id', 'is', null),

          // Launch notification signups
          supabaseAdmin
            .from('launch_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('subscribed', true),

          // Beta requests today
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lt('created_at', `${today}T23:59:59.999Z`),

          // Launch signups today
          supabaseAdmin
            .from('launch_notifications')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lt('created_at', `${today}T23:59:59.999Z`),
        ]);

        // Extract counts from results (handle errors gracefully)
        // Debug: Log the actual results to understand what's being returned
        if (betaUsersResult.status === 'fulfilled') {
          logger.info('[Dashboard Stats] Beta users query result:', {
            component: 'api-route',
            data: {
              count: betaUsersResult.value.count,
              error: betaUsersResult.value.error,
              hasData: betaUsersResult.value.data !== null
            }
          });
        }

        const betaUsers = betaUsersResult.status === 'fulfilled' ? (betaUsersResult.value.count ?? 0) : 0;
        const launchSignups = launchSignupsResult.status === 'fulfilled' ? (launchSignupsResult.value.count ?? 0) : 0;
        const betaRequestsToday = betaRequestsTodayResult.status === 'fulfilled' ? (betaRequestsTodayResult.value.count ?? 0) : 0;
        const signupsToday = signupsTodayResult.status === 'fulfilled' ? (signupsTodayResult.value.count ?? 0) : 0;

        // Log any errors for debugging
        [betaUsersResult, launchSignupsResult, betaRequestsTodayResult, signupsTodayResult]
          .forEach((result, index) => {
            if (result.status === 'rejected') {
              logger.error(`Dashboard stat query ${index} failed:`, undefined, { component: 'api-route', action: 'api_request', details: result.reason });
            } else if (result.value.error) {
              logger.error(`Dashboard stat query ${index} Supabase error:`, undefined, { component: 'api-route', action: 'api_request', details: result.value.error });
            }
          });

        const result = {
          totalUsers,
          activeUsers,
          betaUsers,
          launchSignups,
          betaRequestsToday,
          signupsToday,
          lastUpdated: new Date().toISOString(),
        };

        logger.info('[Dashboard Stats] Computed stats:', {
          component: 'api-route',
          data: result
        });

        return result;
      },
      { ttl: ADMIN_CACHE_TTL.dashboardStats, skipCache: forceRefresh }
    );

    // Log what we're returning (whether from cache or fresh)
    logger.info('[Dashboard Stats] Returning response:', {
      component: 'api-route',
      data: {
        betaUsers: stats.betaUsers,
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        fromCache: !forceRefresh
      }
    });

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/dashboard/stats',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/dashboard/stats GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}