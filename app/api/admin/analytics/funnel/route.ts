import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// Cache key for funnel data
const FUNNEL_CACHE_KEY = 'admin:funnel';

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  color: string;
  description: string;
}

interface FunnelData {
  steps: FunnelStep[];
  conversionRates: {
    notificationToSignup: number;
    signupToActive: number;
    overallConversion: number;
  };
  lastUpdated: string;
}

/**
 * GET /api/admin/analytics/funnel
 * Get conversion funnel data for user signups
 *
 * Funnel stages:
 * 1. Launch Notifications - Users who signed up for notifications
 * 2. Accounts Created - Users who completed signup
 * 3. Active Users - Users who have logged in
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
    let sessionData: { email?: string; adminId?: string; role?: string };
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

    // Check for force refresh
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Fetch funnel data with caching
    const funnel = await withCache<FunnelData>(
      FUNNEL_CACHE_KEY,
      async () => {
        // Fetch all funnel metrics in parallel
        const [
          // Launch notification signups
          notificationsResult,
          // Total user accounts created
          signupsResult,
          // Active users from users table (have logged in)
          activeUsersResult,
        ] = await Promise.allSettled([
          supabaseAdmin
            .from('launch_notifications')
            .select('*', { count: 'exact', head: true }),

          // Count total registered users
          supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true }),

          // Count users who have logged in (have last_seen set)
          supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .not('last_seen', 'is', null),
        ]);

        // Extract counts
        const totalNotifications = notificationsResult.status === 'fulfilled'
          ? (notificationsResult.value.count || 0) : 0;
        const signups = signupsResult.status === 'fulfilled'
          ? (signupsResult.value.count || 0) : 0;
        const activeUsers = activeUsersResult.status === 'fulfilled'
          ? (activeUsersResult.value.count || 0) : 0;

        // Build funnel steps
        const steps: FunnelStep[] = [
          {
            id: 'notifications',
            label: 'Launch Notifications',
            count: totalNotifications,
            color: 'blue',
            description: 'Signed up for launch notifications',
          },
          {
            id: 'signups',
            label: 'Accounts Created',
            count: signups,
            color: 'green',
            description: 'Completed registration',
          },
          {
            id: 'active',
            label: 'Active Users',
            count: activeUsers,
            color: 'emerald',
            description: 'Logged in at least once',
          },
        ];

        // Calculate conversion rates
        const conversionRates = {
          notificationToSignup: totalNotifications > 0
            ? Math.round((signups / totalNotifications) * 100) : 0,
          signupToActive: signups > 0
            ? Math.round((activeUsers / signups) * 100) : 0,
          overallConversion: totalNotifications > 0
            ? Math.round((activeUsers / totalNotifications) * 100) : 0,
        };

        return {
          steps,
          conversionRates,
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.dashboardStats, skipCache: forceRefresh }
    );

    return NextResponse.json({
      success: true,
      funnel,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/analytics/funnel',
        method: 'GET',
      },
    });
    logger.error('[API] /api/admin/analytics/funnel GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
