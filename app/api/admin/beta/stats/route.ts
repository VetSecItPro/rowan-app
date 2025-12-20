import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// Cache key for beta stats
const BETA_STATS_CACHE_KEY = 'beta:stats';

/**
 * GET /api/admin/beta/stats
 * Get comprehensive beta program statistics
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

    // Decrypt and validate admin session (using secure method)
    let sessionData: { email?: string; adminId?: string; role?: string };
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

    // Check for force refresh query param
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Beta program capacity and deadline
    const BETA_CAPACITY = 100;
    const BETA_DEADLINE = '2026-02-15T23:59:59Z';

    // Fetch stats with caching (1 minute TTL)
    const stats = await withCache(
      BETA_STATS_CACHE_KEY,
      async () => {
        // Fetch comprehensive beta statistics in parallel
        const [
          totalRequestsResult,
          approvedRequestsResult,
          pendingRequestsResult,
          activeUsersFromRequestsResult,
          activeUsersFromUsersTableResult,
          recentActivityResult,
          // New: Invite code stats
          totalCodesResult,
          usedCodesResult,
          pendingCodesResult,
          dailyAnalyticsResult,
        ] = await Promise.allSettled([
          // Total beta requests
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true }),

          // Approved requests
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true),

          // Pending requests (approved but no user account yet)
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true)
            .is('user_id', null),

          // Active beta users from requests table (those who have signed up)
          supabaseAdmin
            .from('beta_access_requests')
            .select('*', { count: 'exact', head: true })
            .eq('access_granted', true)
            .not('user_id', 'is', null),

          // ALSO count actual registered users from the users table
          // This is more reliable as a fallback
          supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true }),

          // Recent activity (last 10 beta-related activities)
          supabaseAdmin
            .from('beta_access_requests')
            .select('email, access_granted, created_at, approved_at, user_id, notes')
            .order('created_at', { ascending: false })
            .limit(10),

          // Total invite codes generated
          supabaseAdmin
            .from('beta_invite_codes')
            .select('*', { count: 'exact', head: true }),

          // Used invite codes
          supabaseAdmin
            .from('beta_invite_codes')
            .select('*', { count: 'exact', head: true })
            .not('used_by', 'is', null),

          // Pending invite codes (generated but not used)
          supabaseAdmin
            .from('beta_invite_codes')
            .select('*', { count: 'exact', head: true })
            .is('used_by', null)
            .eq('is_active', true),

          // Daily analytics for the past 7 days
          supabaseAdmin
            .from('beta_daily_analytics')
            .select('*')
            .order('date', { ascending: false })
            .limit(7),
        ]);

        // Extract counts safely
        const totalRequests = totalRequestsResult.status === 'fulfilled' ? (totalRequestsResult.value.count || 0) : 0;
        const approvedRequests = approvedRequestsResult.status === 'fulfilled' ? (approvedRequestsResult.value.count || 0) : 0;
        const pendingRequests = pendingRequestsResult.status === 'fulfilled' ? (pendingRequestsResult.value.count || 0) : 0;

        // Get user count from both sources and use the higher value (users table is more reliable)
        const activeUsersFromRequests = activeUsersFromRequestsResult.status === 'fulfilled' ? (activeUsersFromRequestsResult.value.count || 0) : 0;
        const activeUsersFromTable = activeUsersFromUsersTableResult.status === 'fulfilled' ? (activeUsersFromUsersTableResult.value.count || 0) : 0;
        const activeUsers = Math.max(activeUsersFromRequests, activeUsersFromTable);

        // Extract invite code stats
        const totalCodes = totalCodesResult.status === 'fulfilled' ? (totalCodesResult.value.count || 0) : 0;
        const usedCodes = usedCodesResult.status === 'fulfilled' ? (usedCodesResult.value.count || 0) : 0;
        const pendingCodes = pendingCodesResult.status === 'fulfilled' ? (pendingCodesResult.value.count || 0) : 0;

        // Extract daily analytics
        const dailyAnalytics = dailyAnalyticsResult.status === 'fulfilled' && dailyAnalyticsResult.value.data
          ? dailyAnalyticsResult.value.data
          : [];

        // Process recent activity
        let recentActivity: Array<{
          type: 'request' | 'approval' | 'signup' | 'activity' | 'code_generated';
          email: string;
          timestamp: string;
          details: string;
        }> = [];

        if (recentActivityResult.status === 'fulfilled' && recentActivityResult.value.data) {
          recentActivity = recentActivityResult.value.data.map((record: any) => {
            const isCodeGenerated = record.notes?.includes('Auto-generated code');
            if (record.user_id) {
              return {
                type: 'signup' as const,
                email: record.email || 'Unknown',
                timestamp: record.approved_at || record.created_at,
                details: 'completed beta signup and created account',
              };
            } else if (isCodeGenerated) {
              return {
                type: 'code_generated' as const,
                email: record.email || 'Unknown',
                timestamp: record.created_at,
                details: 'requested and received invite code via email',
              };
            } else if (record.access_granted) {
              return {
                type: 'approval' as const,
                email: record.email || 'Unknown',
                timestamp: record.approved_at || record.created_at,
                details: 'was approved for beta access',
              };
            } else {
              return {
                type: 'request' as const,
                email: record.email || 'Unknown',
                timestamp: record.created_at,
                details: 'attempted beta access',
              };
            }
          });
        }

        // Calculate metrics
        const conversionRate = totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0;
        const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
        const signupRate = approvedRequests > 0 ? Math.round((activeUsers / approvedRequests) * 100) : 0;

        // Beta program capacity
        const capacity = BETA_CAPACITY;
        const capacityUsage = Math.round((activeUsers / capacity) * 100);
        const slotsRemaining = capacity - usedCodes;

        // Calculate average activity score (placeholder - would need user activity data)
        const averageActivityScore = 7.5; // Mock data - replace with real calculation

        // Calculate weekly growth from daily analytics
        const thisWeekRequests = dailyAnalytics.reduce((sum: number, day: any) => sum + (day.requests_count || 0), 0);
        const thisWeekSignups = dailyAnalytics.reduce((sum: number, day: any) => sum + (day.signups_count || 0), 0);

        // Log any errors for debugging
        const allResults = [
          totalRequestsResult, approvedRequestsResult, pendingRequestsResult,
          activeUsersFromRequestsResult, activeUsersFromUsersTableResult, recentActivityResult,
          totalCodesResult, usedCodesResult, pendingCodesResult, dailyAnalyticsResult
        ];
        allResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            logger.error(`Beta stat query ${index} failed:`, undefined, { component: 'api-route', action: 'api_request', details: result.reason });
          }
        });

        return {
          totalRequests,
          approvedRequests,
          pendingRequests,
          activeUsers,
          capacity,
          conversionRate,
          approvalRate,
          signupRate,
          capacityUsage,
          averageActivityScore,
          recentActivity,
          // New: Invite code stats
          inviteCodes: {
            total: totalCodes,
            used: usedCodes,
            pending: pendingCodes,
            redemptionRate: totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0,
          },
          dailyAnalytics,
          betaDeadline: BETA_DEADLINE,
          metrics: {
            slotsRemaining,
            weeklyRequests: thisWeekRequests,
            weeklySignups: thisWeekSignups,
            averageTimeToSignup: '2.5 hours', // Mock data
            codeRedemptionRate: conversionRate,
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.dashboardStats, skipCache: forceRefresh }
    );

    // Log admin access

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/beta/stats',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/beta/stats GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch beta statistics' },
      { status: 500 }
    );
  }
}