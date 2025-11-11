import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/beta/users
 * Get active beta users with activity metrics
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

    // Get beta users by joining beta_access_requests with auth.users
    const { data: betaRequests, error: betaError } = await supabase
      .from('beta_access_requests')
      .select('user_id, email, created_at, approved_at')
      .eq('access_granted', true)
      .not('user_id', 'is', null);

    if (betaError) {
      throw new Error(`Failed to fetch beta users: ${betaError.message}`);
    }

    // Get user details from auth.users for each beta user
    const betaUsers: any[] = [];

    if (betaRequests && betaRequests.length > 0) {
      const userIds = betaRequests.map((request: any) => request.user_id);

      // Get auth users data
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000, // Adjust as needed
      });

      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      // Filter and enhance beta users
      betaRequests.forEach((betaRequest: any) => {
        const authUser = authUsers.users.find((user: any) => user.id === betaRequest.user_id);

        if (authUser) {
          // Calculate activity metrics (mock data for now)
          const daysSinceJoin = Math.floor(
            (Date.now() - new Date(authUser.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          const daysSinceLastLogin = authUser.last_sign_in_at
            ? Math.floor((Date.now() - new Date(authUser.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          // Mock activity score calculation (replace with real metrics)
          const activityScore = Math.max(0, 10 - daysSinceLastLogin) +
                               (daysSinceJoin < 7 ? 2 : 0) +
                               Math.floor(Math.random() * 5); // Mock component

          betaUsers.push({
            id: authUser.id,
            email: authUser.email || betaRequest.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            beta_joined_at: betaRequest.approved_at || betaRequest.created_at,
            days_since_join: daysSinceJoin,
            days_since_last_login: daysSinceLastLogin,
            activity_score: Math.min(10, activityScore),
            sessions_count: Math.floor(Math.random() * 50) + 1, // Mock data
            beta_feedback_count: Math.floor(Math.random() * 5), // Mock data
            is_active: daysSinceLastLogin < 7,
            engagement_level: activityScore > 7 ? 'high' : activityScore > 4 ? 'medium' : 'low',
          });
        }
      });
    }

    // Sort by activity score descending
    betaUsers.sort((a, b) => b.activity_score - a.activity_score);

    // Calculate summary statistics
    const summary = {
      total: betaUsers.length,
      active: betaUsers.filter(user => user.is_active).length,
      inactive: betaUsers.filter(user => !user.is_active).length,
      high_engagement: betaUsers.filter(user => user.engagement_level === 'high').length,
      average_activity_score: betaUsers.length > 0
        ? (betaUsers.reduce((sum, user) => sum + user.activity_score, 0) / betaUsers.length).toFixed(1)
        : 0,
      retention_rate: betaUsers.length > 0
        ? Math.round((betaUsers.filter(user => user.is_active).length / betaUsers.length) * 100)
        : 0,
    };

    // Log admin access
    console.log(`Admin beta users accessed by: ${sessionData.email} from IP: ${ip}`);

    return NextResponse.json({
      success: true,
      users: betaUsers,
      summary,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/beta/users',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/beta/users GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beta users' },
      { status: 500 }
    );
  }
}