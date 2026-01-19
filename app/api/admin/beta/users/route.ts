import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

type BetaRequestRecord = {
  user_id: string;
  email: string | null;
  created_at: string;
  approved_at?: string | null;
};

type AuthUserRecord = {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
};

type BetaUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  beta_joined_at: string;
  days_since_join: number;
  days_since_last_login: number;
  activity_score: number;
  sessions_count: number;
  beta_feedback_count: number;
  is_active: boolean;
  engagement_level: 'high' | 'medium' | 'low';
};

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

    // Check admin authentication using secure AES-256-GCM encryption
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

      // Validate session data structure and expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Invalid or expired session' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get beta users by joining beta_access_requests with auth.users
    const { data: betaRequests, error: betaError } = await supabaseAdmin
      .from('beta_access_requests')
      .select('user_id, email, created_at, approved_at')
      .eq('access_granted', true)
      .not('user_id', 'is', null);

    if (betaError) {
      throw new Error(`Failed to fetch beta users: ${betaError.message}`);
    }

    // Get user details from auth.users for each beta user
    const betaUsers: BetaUser[] = [];

    if (betaRequests && betaRequests.length > 0) {
      // Get auth users data
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000, // Adjust as needed
      });

      if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
      }

      // Filter and enhance beta users
      betaRequests.forEach((betaRequest) => {
        const requestRecord = betaRequest as BetaRequestRecord;
        const authUser = authUsers.users.find((user) => user.id === requestRecord.user_id) as AuthUserRecord | undefined;

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
            email: authUser.email || requestRecord.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            beta_joined_at: requestRecord.approved_at || requestRecord.created_at,
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
    logger.error('[API] /api/admin/beta/users GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch beta users' },
      { status: 500 }
    );
  }
}
