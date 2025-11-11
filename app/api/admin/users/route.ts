import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Get all users for admin management
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

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Fetch users from auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    // Get beta access information for users
    const userIds = authUsers.users.map((user: any) => user.id);

    let betaUsers: any[] = [];
    if (userIds.length > 0) {
      const { data: betaData, error: betaError } = await supabase
        .from('beta_access_requests')
        .select('user_id, access_granted')
        .in('user_id', userIds)
        .eq('access_granted', true);

      if (!betaError) {
        betaUsers = betaData || [];
      }
    }

    // Create a set of beta user IDs for quick lookup
    const betaUserIds = new Set(betaUsers.map(beta => beta.user_id));

    // Transform users data
    const users = authUsers.users.map((user: any) => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      is_beta: betaUserIds.has(user.id),
      status: user.last_sign_in_at ? 'active' : 'inactive', // Simple status logic
      user_metadata: user.user_metadata,
    }));

    // Get total count for pagination
    const totalUsers = authUsers.total || users.length;

    // Log admin access
    console.log(`Admin users list accessed by: ${sessionData.email} from IP: ${ip}`);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/users',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/users GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}