import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

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
    const cookieStore = cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decode admin session
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

    // Fetch comprehensive beta statistics in parallel
    const [
      totalRequestsResult,
      approvedRequestsResult,
      pendingRequestsResult,
      activeUsersResult,
      recentActivityResult,
    ] = await Promise.allSettled([
      // Total beta requests
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true }),

      // Approved requests
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('access_granted', true),

      // Pending requests (approved but no user account yet)
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('access_granted', true)
        .is('user_id', null),

      // Active beta users (those who have signed up)
      supabase
        .from('beta_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('access_granted', true)
        .not('user_id', 'is', null),

      // Recent activity (last 10 beta-related activities)
      supabase
        .from('beta_access_requests')
        .select('email, access_granted, created_at, approved_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Extract counts safely
    const totalRequests = totalRequestsResult.status === 'fulfilled' ? (totalRequestsResult.value.count || 0) : 0;
    const approvedRequests = approvedRequestsResult.status === 'fulfilled' ? (approvedRequestsResult.value.count || 0) : 0;
    const pendingRequests = pendingRequestsResult.status === 'fulfilled' ? (pendingRequestsResult.value.count || 0) : 0;
    const activeUsers = activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0;

    // Process recent activity
    let recentActivity: Array<{
      type: 'request' | 'approval' | 'signup' | 'activity';
      email: string;
      timestamp: string;
      details: string;
    }> = [];

    if (recentActivityResult.status === 'fulfilled' && recentActivityResult.value.data) {
      recentActivity = recentActivityResult.value.data.map((record: any) => {
        if (record.user_id) {
          return {
            type: 'signup' as const,
            email: record.email,
            timestamp: record.approved_at || record.created_at,
            details: 'completed beta signup and created account',
          };
        } else if (record.access_granted) {
          return {
            type: 'approval' as const,
            email: record.email,
            timestamp: record.approved_at || record.created_at,
            details: 'was approved for beta access',
          };
        } else {
          return {
            type: 'request' as const,
            email: record.email,
            timestamp: record.created_at,
            details: 'requested beta access',
          };
        }
      });
    }

    // Calculate metrics
    const conversionRate = totalRequests > 0 ? Math.round((activeUsers / totalRequests) * 100) : 0;
    const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
    const signupRate = approvedRequests > 0 ? Math.round((activeUsers / approvedRequests) * 100) : 0;

    // Beta program capacity (from plan: 30 users max)
    const capacity = 30;
    const capacityUsage = Math.round((activeUsers / capacity) * 100);

    // Calculate average activity score (placeholder - would need user activity data)
    const averageActivityScore = 7.5; // Mock data - replace with real calculation

    // Compile comprehensive stats
    const stats = {
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
      metrics: {
        slotsRemaining: capacity - activeUsers,
        weeklyGrowth: 15, // Mock data - calculate from time-based queries
        averageTimeToSignup: '2.5 hours', // Mock data
        passwordSuccessRate: approvalRate,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Log any errors for debugging
    [totalRequestsResult, approvedRequestsResult, pendingRequestsResult, activeUsersResult, recentActivityResult]
      .forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Beta stat query ${index} failed:`, result.reason);
        }
      });

    // Log admin access
    console.log(`Admin beta stats accessed by: ${sessionData.email} from IP: ${ip}`);

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
    console.error('[API] /api/admin/beta/stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beta statistics' },
      { status: 500 }
    );
  }
}