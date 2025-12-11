import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/beta-requests
 * Get all beta access requests for admin management
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

    // Decrypt and validate admin session
    let sessionData: any;
    try {
      sessionData = await decryptSessionData(adminSession.value);

      // Validate session data and check expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('Admin session decryption failed:', error);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'approved', 'pending', or null for all
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Fetch with caching
    const { requests, summary, count } = await withCache(
      ADMIN_CACHE_KEYS.betaRequests(page, status),
      async () => {
        let query = supabaseAdmin
          .from('beta_access_requests')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply status filter
        if (status === 'approved') {
          query = query.eq('access_granted', true);
        } else if (status === 'pending') {
          query = query.eq('access_granted', false);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: betaRequests, error: betaError, count } = await query;

        if (betaError) {
          throw new Error(`Failed to fetch beta requests: ${betaError.message}`);
        }

        // Transform the data to include additional information
        // SECURITY: password_attempt intentionally excluded to prevent credential exposure
        const requests = (betaRequests || []).map((request: any) => ({
          id: request.id,
          email: request.email,
          // password_attempt removed for security - credentials should never be exposed
          ip_address: request.ip_address,
          user_agent: request.user_agent,
          access_granted: request.access_granted,
          user_id: request.user_id,
          created_at: request.created_at,
          approved_at: request.approved_at,
          notes: request.notes,
        }));

        // Get summary statistics
        const { data: stats, error: statsError } = await supabaseAdmin
          .from('beta_access_requests')
          .select(`
            access_granted,
            user_id
          `);

        let summary = {
          total: 0,
          approved: 0,
          pending: 0,
          with_accounts: 0,
        };

        if (!statsError && stats) {
          summary.total = stats.length;
          summary.approved = stats.filter((s: any) => s.access_granted).length;
          summary.pending = stats.filter((s: any) => !s.access_granted).length;
          summary.with_accounts = stats.filter((s: any) => s.user_id !== null).length;
        }

        return { requests, summary, count: count || 0 };
      },
      { ttl: ADMIN_CACHE_TTL.betaRequests, skipCache: forceRefresh }
    );

    // Log admin access

    return NextResponse.json({
      success: true,
      requests,
      summary,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/beta-requests',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/admin/beta-requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beta requests' },
      { status: 500 }
    );
  }
}