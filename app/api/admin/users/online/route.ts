import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/online
 * Get all users with their online presence status
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

    // Get all users with their presence info
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        is_beta_tester,
        beta_status,
        beta_signup_date,
        created_at,
        updated_at,
        last_seen,
        is_online
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Get beta access requests for additional info
    const { data: betaRequests, error: betaError } = await supabase
      .from('beta_access_requests')
      .select('user_id, email, access_granted, created_at, approved_at');

    // Get recent activity for online users
    const { data: recentActivity, error: activityError } = await supabase
      .from('beta_tester_activity')
      .select('user_id, activity_type, created_at')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    // Combine data
    const enrichedUsers = users?.map(user => {
      const betaRequest = betaRequests?.find(req => req.user_id === user.id || req.email === user.email);
      const hasRecentActivity = recentActivity?.some(activity =>
        activity.user_id === user.id &&
        new Date(activity.created_at).getTime() > Date.now() - 5 * 60 * 1000
      );

      return {
        ...user,
        beta_request: betaRequest,
        is_online: hasRecentActivity || false,
        last_activity: recentActivity?.find(a => a.user_id === user.id)?.created_at
      };
    });

    // Calculate stats
    const stats = {
      total_users: users?.length || 0,
      online_users: enrichedUsers?.filter(u => u.is_online).length || 0,
      beta_testers: users?.filter(u => u.is_beta_tester).length || 0,
      approved_beta: users?.filter(u => u.is_beta_tester && u.beta_status === 'approved').length || 0,
      new_today: users?.filter(u =>
        new Date(u.created_at).toDateString() === new Date().toDateString()
      ).length || 0
    };

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/users/online',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/users/online GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}