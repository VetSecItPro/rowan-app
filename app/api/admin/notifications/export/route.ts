import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/notifications/export
 * Export notification data as CSV
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { ids, format = 'csv', includeAll = false } = body;

    // Create Supabase client
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('launch_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    // If specific IDs are provided, filter by them
    if (!includeAll && ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { data: notifications, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications for export: ${error.message}`);
    }

    // Generate CSV content
    if (format === 'csv') {
      // CSV headers
      const headers = [
        'ID',
        'Name',
        'Email',
        'Source',
        'Referrer',
        'IP Address',
        'User Agent',
        'Subscribed',
        'Created At',
        'Unsubscribed At'
      ];

      // CSV rows
      const rows = (notifications || []).map((notification: any) => [
        notification.id,
        `"${(notification.name || '').replace(/"/g, '""')}"`, // Escape quotes
        `"${(notification.email || '').replace(/"/g, '""')}"`,
        `"${(notification.source || 'homepage').replace(/"/g, '""')}"`,
        `"${(notification.referrer || '').replace(/"/g, '""')}"`,
        `"${(notification.ip_address || '').replace(/"/g, '""')}"`,
        `"${(notification.user_agent || '').replace(/"/g, '""')}"`,
        notification.subscribed ? 'Yes' : 'No',
        notification.created_at ? new Date(notification.created_at).toISOString() : '',
        notification.unsubscribed_at ? new Date(notification.unsubscribed_at).toISOString() : ''
      ]);

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');

      // Log export activity

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="launch-notifications-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format (fallback)

    return NextResponse.json({
      success: true,
      data: notifications,
      exportedAt: new Date().toISOString(),
      recordCount: notifications?.length || 0,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/notifications/export',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/notifications/export POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to export notifications' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/notifications/export
 * Export all notifications as CSV (for direct download links)
 */
export async function GET(req: NextRequest) {
  try {
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

    // Create a POST request to ourselves with includeAll=true
    return POST(req);

  } catch (error) {
    logger.error('[API] /api/admin/notifications/export GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to export notifications' },
      { status: 500 }
    );
  }
}