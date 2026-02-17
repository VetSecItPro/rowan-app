import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logAdminAction } from '@/lib/utils/admin-audit';

type NotificationRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  source?: string | null;
  referrer?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  subscribed?: boolean;
  created_at?: string | null;
  unsubscribed_at?: string | null;
};

const ExportRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).optional(),
  format: z.enum(['csv', 'json']).optional(),
  includeAll: z.boolean().optional(),
}).strict();

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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const parsedBody = ExportRequestSchema.parse(body);
    const format = parsedBody.format ?? 'csv';
    const includeAll = parsedBody.includeAll ?? false;
    const ids = parsedBody.ids;

    // Build query
    let query = supabaseAdmin
      .from('launch_notifications')
      .select('id, name, email, source, referrer, ip_address, user_agent, subscribed, created_at, unsubscribed_at')
      .order('created_at', { ascending: false });

    // If specific IDs are provided, filter by them
    if (!includeAll && ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    }

    // Cap max export size to prevent unbounded queries (FIX-017)
    query = query.limit(50000);

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
      const rows = (notifications || []).map((notification) => {
        const record = notification as NotificationRecord;
        return [
          record.id,
          `"${(record.name || '').replace(/"/g, '""')}"`, // Escape quotes
          `"${(record.email || '').replace(/"/g, '""')}"`,
          `"${(record.source || 'homepage').replace(/"/g, '""')}"`,
          `"${(record.referrer || '').replace(/"/g, '""')}"`,
          `"${(record.ip_address || '').replace(/"/g, '""')}"`,
          `"${(record.user_agent || '').replace(/"/g, '""')}"`,
          record.subscribed ? 'Yes' : 'No',
          record.created_at ? new Date(record.created_at).toISOString() : '',
          record.unsubscribed_at ? new Date(record.unsubscribed_at).toISOString() : ''
        ];
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.join(','))].join('\n');

      // Audit log: data export
      const adminId = (sessionData as { adminId?: string }).adminId;
      if (adminId) {
        logAdminAction({
          adminUserId: adminId,
          action: 'data_export',
          targetResource: 'launch_notifications',
          metadata: { format: 'csv', recordCount: notifications?.length || 0 },
          ipAddress: ip,
        });
      }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
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
