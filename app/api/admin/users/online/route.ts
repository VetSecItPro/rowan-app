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

// Type definitions for this route's database queries
interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
  is_online: boolean | null;
}

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
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get all users with their presence info (using admin client to bypass RLS)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        avatar_url,
        created_at,
        updated_at,
        last_seen,
        is_online
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error('Failed to fetch users:', usersError, { component: 'api-route', action: 'admin_users_online' });
      throw new Error('Failed to fetch users');
    }

    // Determine online status based on last_seen within 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const enrichedUsers = (users as AdminUser[] | null)?.map((user: AdminUser) => {
      const recentlySeen = user.last_seen
        ? new Date(user.last_seen).getTime() > fiveMinutesAgo
        : false;

      return {
        ...user,
        is_online: user.is_online || recentlySeen,
      };
    });

    // Calculate stats
    const typedUsers = users as AdminUser[] | null;
    const stats = {
      total_users: typedUsers?.length || 0,
      online_users: enrichedUsers?.filter((u) => u.is_online).length || 0,
      new_today: typedUsers?.filter((u: AdminUser) =>
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
    });
    logger.error('[API] /api/admin/users/online GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
