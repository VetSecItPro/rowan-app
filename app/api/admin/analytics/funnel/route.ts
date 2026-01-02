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
    requestToCode: number;
    codeToSignup: number;
    overallConversion: number;
  };
  recentConversions: Array<{
    email: string;
    step: string;
    timestamp: string;
  }>;
  lastUpdated: string;
}

/**
 * GET /api/admin/analytics/funnel
 * Get conversion funnel data for beta signups
 *
 * Funnel stages:
 * 1. Beta Requests - Users who submitted their email
 * 2. Codes Sent - Users who received an invite code
 * 3. Accounts Created - Users who completed signup
 * 4. Active Users - Users who have logged in
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
          // Total beta access requests (people who submitted email)
          totalRequestsResult,
          // Requests that have access_granted = true (code was sent)
          codesSentResult,
          // Requests where user_id is not null (completed signup)
          signupsResult,
          // Active users from users table (have logged in)
          activeUsersResult,
          // Recent activity for the timeline
          recentActivityResult,
        ] = await Promise.allSettled([
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true }),

          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true),

          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true)
            .not('user_id', 'is', null),

          // Count users who have logged in (have last_seen set)
          supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .not('last_seen', 'is', null),

          // Get recent conversions
          supabaseAdmin
            .from('beta_access_requests')
            .select('email, access_granted, user_id, created_at, approved_at')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        // Extract counts
        const totalRequests = totalRequestsResult.status === 'fulfilled'
          ? (totalRequestsResult.value.count || 0) : 0;
        const codesSent = codesSentResult.status === 'fulfilled'
          ? (codesSentResult.value.count || 0) : 0;
        const signups = signupsResult.status === 'fulfilled'
          ? (signupsResult.value.count || 0) : 0;
        const activeUsers = activeUsersResult.status === 'fulfilled'
          ? (activeUsersResult.value.count || 0) : 0;

        // Build funnel steps
        const steps: FunnelStep[] = [
          {
            id: 'requests',
            label: 'Beta Requests',
            count: totalRequests,
            color: 'blue',
            description: 'Submitted email for beta access',
          },
          {
            id: 'codes',
            label: 'Codes Sent',
            count: codesSent,
            color: 'purple',
            description: 'Received invite code via email',
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
          requestToCode: totalRequests > 0
            ? Math.round((codesSent / totalRequests) * 100) : 0,
          codeToSignup: codesSent > 0
            ? Math.round((signups / codesSent) * 100) : 0,
          overallConversion: totalRequests > 0
            ? Math.round((activeUsers / totalRequests) * 100) : 0,
        };

        // Process recent conversions
        const recentConversions: Array<{
          email: string;
          step: string;
          timestamp: string;
        }> = [];

        if (recentActivityResult.status === 'fulfilled' && recentActivityResult.value.data) {
          for (const record of recentActivityResult.value.data) {
            // Determine which step this represents
            let step = 'Requested beta access';
            let timestamp = record.created_at;

            if (record.user_id) {
              step = 'Created account';
              timestamp = record.approved_at || record.created_at;
            } else if (record.access_granted) {
              step = 'Received invite code';
              timestamp = record.approved_at || record.created_at;
            }

            recentConversions.push({
              email: record.email || 'Unknown',
              step,
              timestamp,
            });
          }
        }

        return {
          steps,
          conversionRates,
          recentConversions,
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
