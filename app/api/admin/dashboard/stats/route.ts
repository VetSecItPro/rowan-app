import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';

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

    // Check admin authentication
    const cookieStore = safeCookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decode admin session (simplified for now)
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(adminSession.value, 'base64').toString());

      // Check if session is expired
      if (sessionData.expiresAt < Date.now()) {
        return NextResponse.json(
          { error: 'Session expired' },
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

    // Get current date for today's stats
    const today = new Date().toISOString().split('T')[0];

    // Fetch statistics in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      betaUsersResult,
      launchSignupsResult,
      betaRequestsTodayResult,
      signupsTodayResult,
    ] = await Promise.allSettled([
      // Total registered users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),

      // Active users (users who logged in in the last 30 days)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Beta users (approved beta access requests with user_id)
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('access_granted', true)
        .not('user_id', 'is', null),

      // Launch notification signups
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', true),

      // Beta requests today
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),

      // Launch signups today
      supabase
        .from('launch_notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),
    ]);

    // Extract counts from results (handle errors gracefully)
    const totalUsers = totalUsersResult.status === 'fulfilled' ? (totalUsersResult.value.count || 0) : 0;
    const activeUsers = activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0;
    const betaUsers = betaUsersResult.status === 'fulfilled' ? (betaUsersResult.value.count || 0) : 0;
    const launchSignups = launchSignupsResult.status === 'fulfilled' ? (launchSignupsResult.value.count || 0) : 0;
    const betaRequestsToday = betaRequestsTodayResult.status === 'fulfilled' ? (betaRequestsTodayResult.value.count || 0) : 0;
    const signupsToday = signupsTodayResult.status === 'fulfilled' ? (signupsTodayResult.value.count || 0) : 0;

    // Log any errors for debugging
    [totalUsersResult, activeUsersResult, betaUsersResult, launchSignupsResult, betaRequestsTodayResult, signupsTodayResult]
      .forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Dashboard stat query ${index} failed:`, result.reason);
        }
      });

    // Compile statistics
    const stats = {
      totalUsers,
      activeUsers,
      betaUsers,
      launchSignups,
      betaRequestsToday,
      signupsToday,
      lastUpdated: new Date().toISOString(),
    };

    // Log admin dashboard access
    console.log(`Admin dashboard stats accessed by: ${sessionData.email} from IP: ${ip}`);

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
    console.error('[API] /api/admin/dashboard/stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}