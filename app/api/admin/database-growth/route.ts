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

interface DatabaseGrowthResponse {
  tables: Array<{
    schema: string;
    tableName: string;
    rowCount: number;
  }>;
  totalSize: string;
  timestamp: string;
}

/**
 * GET /api/admin/database-growth
 * Get database size and table row counts
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
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    try {
      const sessionData = await decryptSessionData(adminSession.value);

      // Validate session data and check expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Fetch table row counts from all tables in the public schema
    // We'll aggregate row counts from the tables we know exist
    const knownTables = [
      'users', 'spaces', 'space_members', 'tasks', 'launch_notifications',
      'feature_events', 'subscriptions', 'subscription_events', 'admin_logins',
    ];

    // Fetch row counts for all known tables in parallel
    const tableCountQueries = knownTables.map((tableName) =>
      supabaseAdmin
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .then((result) => ({
          tableName,
          count: result.count || 0,
          error: result.error,
        }))
    );

    const tableCountResults = await Promise.allSettled(tableCountQueries);

    // Process table counts
    const tables: Array<{ schema: string; tableName: string; rowCount: number }> = [];

    tableCountResults.forEach((result) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        tables.push({
          schema: 'public',
          tableName: result.value.tableName,
          rowCount: result.value.count,
        });
      }
    });

    // Sort by row count descending
    tables.sort((a, b) => b.rowCount - a.rowCount);

    // For database size, we'll calculate approximate size based on row counts
    // A more accurate size would require direct PostgreSQL queries which need special permissions
    const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0);
    const totalSize = totalRows > 0 ? `~${Math.round(totalRows / 1000)}K rows` : 'N/A';

    const response: DatabaseGrowthResponse = {
      tables,
      totalSize,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/database-growth',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/database-growth GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch database growth data' },
      { status: 500 }
    );
  }
}
