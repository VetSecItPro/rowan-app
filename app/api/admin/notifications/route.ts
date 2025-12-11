import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * SECURITY: Sanitize search input for PostgreSQL ILIKE patterns
 * Escapes special characters: %, _, and \ which have special meaning in LIKE/ILIKE
 */
function sanitizeSearchInput(input: string): string {
  // Escape backslash first (order matters!), then % and _
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/%/g, '\\%')    // Escape wildcard %
    .replace(/_/g, '\\_')    // Escape single char wildcard _
    .slice(0, 100);          // Limit length to prevent DoS
}

/**
 * GET /api/admin/notifications
 * Get all launch notifications for admin management
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
    const cookieStore = safeCookies();
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

    // Create Supabase client
    const supabase = createClient();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'subscribed', 'unsubscribed', or null for all
    const search = searchParams.get('search') || '';

    // Build query
    let query = supabase
      .from('launch_notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status === 'subscribed') {
      query = query.eq('subscribed', true);
    } else if (status === 'unsubscribed') {
      query = query.eq('subscribed', false);
    }

    // Apply search filter with sanitization
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: notifications, error: notificationsError, count } = await query;

    if (notificationsError) {
      throw new Error(`Failed to fetch notifications: ${notificationsError.message}`);
    }

    // Transform the data
    const transformedNotifications = (notifications || []).map((notification: any) => ({
      id: notification.id,
      name: notification.name,
      email: notification.email,
      source: notification.source || 'homepage',
      referrer: notification.referrer,
      ip_address: notification.ip_address,
      user_agent: notification.user_agent,
      subscribed: notification.subscribed,
      created_at: notification.created_at,
      unsubscribed_at: notification.unsubscribed_at,
    }));

    // Log admin access

    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/notifications',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/notifications GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}