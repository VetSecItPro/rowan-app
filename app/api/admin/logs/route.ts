/**
 * Admin Logs API
 * Phase 9.2: Error Monitoring - Admin access to monetization logs
 *
 * GET /api/admin/logs - Query monetization logs with filtering
 *
 * Query Parameters:
 * - level: Filter by log level (info, warn, error)
 * - event: Filter by event type
 * - userId: Filter by user ID
 * - startDate: ISO date string for start of range
 * - endDate: ISO date string for end of range
 * - limit: Number of results (default 100, max 1000)
 * - offset: Pagination offset
 *
 * SECURITY: Admin-only access via admin_users table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getErrorStats } from '@/lib/utils/error-alerting';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const querySchema = z.object({
  level: z.enum(['info', 'warn', 'error']).optional(),
  event: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

async function verifyAdminAccess(request: NextRequest): Promise<{
  isAdmin: boolean;
  email?: string;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { isAdmin: false, error: 'Server configuration error' };
  }

  // Get auth token from cookie or header
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.cookies.get('sb-access-token')?.value;
  const token = authHeader?.replace('Bearer ', '') || cookieHeader;

  if (!token) {
    return { isAdmin: false, error: 'No authentication token provided' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Verify the token and get user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { isAdmin: false, error: 'Invalid authentication token' };
  }

  // Check if user is in admin_users table
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('email, role, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .single();

  if (adminError || !adminUser) {
    return { isAdmin: false, error: 'Access denied - not an admin' };
  }

  return { isAdmin: true, email: adminUser.email };
}

// ============================================================================
// GET HANDLER
// ============================================================================

/** Queries monetization logs with filtering and pagination */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      level: searchParams.get('level') || undefined,
      event: searchParams.get('event') || undefined,
      userId: searchParams.get('userId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    };

    const validatedParams = querySchema.parse(queryParams);

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Build query
    let query = supabase
      .from('monetization_logs')
      .select('id, timestamp, level, event, user_id, tier, period, amount, currency, polar_customer_id, polar_subscription_id, polar_session_id, polar_event_id, trigger_source, error_message', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1);

    // Apply filters
    if (validatedParams.level) {
      query = query.eq('level', validatedParams.level);
    }
    if (validatedParams.event) {
      query = query.eq('event', validatedParams.event);
    }
    if (validatedParams.userId) {
      query = query.eq('user_id', validatedParams.userId);
    }
    if (validatedParams.startDate) {
      query = query.gte('timestamp', validatedParams.startDate);
    }
    if (validatedParams.endDate) {
      query = query.lte('timestamp', validatedParams.endDate);
    }

    // Execute main query and summary query in parallel
    const [logsResult, summaryResult] = await Promise.all([
      query,
      supabase
        .from('monetization_error_summary')
        .select('error_type, count, first_seen, last_seen')
        .limit(100),
    ]);

    const { data: logs, error, count } = logsResult;
    const { data: errorSummary } = summaryResult;

    if (error) {
      logger.error('[ADMIN_LOGS] Query error:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    // Get error stats from in-memory tracker
    const errorStats = getErrorStats();

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          total: count || 0,
          limit: validatedParams.limit,
          offset: validatedParams.offset,
          hasMore: (count || 0) > validatedParams.offset + validatedParams.limit,
        },
        stats: {
          realtime: errorStats,
          summary: errorSummary || [],
        },
      },
    });
  } catch (error) {
    logger.error('[ADMIN_LOGS] Error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST HANDLER - Export logs to CSV
// ============================================================================

/** Exports monetization logs to CSV or JSON format */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, level, format = 'csv' } = body;

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Build query for export (max 10000 rows)
    let query = supabase
      .from('monetization_logs')
      .select('timestamp, level, event, user_id, tier, period, amount, currency, polar_customer_id, polar_subscription_id, polar_session_id, polar_event_id, trigger_source, error_message')
      .order('timestamp', { ascending: false })
      .limit(10000);

    if (level) {
      query = query.eq('level', level);
    }
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to export logs' },
        { status: 500 }
      );
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'timestamp',
        'level',
        'event',
        'user_id',
        'tier',
        'period',
        'amount',
        'currency',
        'polar_customer_id',
        'polar_subscription_id',
        'polar_session_id',
        'polar_event_id',
        'trigger_source',
        'error_message',
      ];

      const csvRows = [
        headers.join(','),
        ...(logs || []).map((log) =>
          headers
            .map((header) => {
              const value = log[header as keyof typeof log];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            })
            .join(',')
        ),
      ];

      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="monetization-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data: logs,
      exportedAt: new Date().toISOString(),
      count: logs?.length || 0,
    });
  } catch (error) {
    logger.error('[ADMIN_LOGS] Export error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to export logs' },
      { status: 500 }
    );
  }
}
