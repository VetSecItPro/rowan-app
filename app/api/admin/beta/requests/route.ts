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
  id: string;
  email: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  access_granted?: boolean;
  user_id?: string | null;
  created_at: string;
  approved_at?: string | null;
  notes?: string | null;
};

type EnhancedRequest = {
  id: string;
  email: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  browser_info: string;
  access_granted?: boolean;
  user_id?: string | null;
  created_at: string;
  approved_at?: string | null;
  notes?: string | null;
  status: 'active_user' | 'approved_pending' | 'failed';
  days_since_request: number;
  has_account: boolean;
};

/**
 * GET /api/admin/beta/requests
 * Get beta access requests with enhanced admin data
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
    let sessionData: { email?: string; adminId?: string; role?: string };
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
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'approved', 'pending', 'failed', or null for all
    const search = searchParams.get('search') || '';

    // Build query with enhanced data (password_attempt excluded for security)
    let query = supabaseAdmin
      .from('beta_access_requests')
      .select(`
        id,
        email,
        ip_address,
        user_agent,
        access_granted,
        user_id,
        created_at,
        approved_at,
        notes
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status === 'approved') {
      query = query.eq('access_granted', true);
    } else if (status === 'pending') {
      // Approved but no user account yet
      query = query.eq('access_granted', true).is('user_id', null);
    } else if (status === 'failed') {
      query = query.eq('access_granted', false);
    }

    // Apply search filter
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: requests, error: requestsError, count } = await query;

    if (requestsError) {
      throw new Error(`Failed to fetch beta requests: ${requestsError.message}`);
    }

    // Enhance the data with additional information
    const enhancedRequests: EnhancedRequest[] = (requests || []).map((request) => {
      const requestRecord = request as BetaRequestRecord;
      // Determine request status
      let requestStatus: 'active_user' | 'approved_pending' | 'failed';
      if (requestRecord.access_granted && requestRecord.user_id) {
        requestStatus = 'active_user';
      } else if (requestRecord.access_granted) {
        requestStatus = 'approved_pending';
      } else {
        requestStatus = 'failed';
      }

      // Parse user agent for browser info
      let browserInfo = 'Unknown';
      if (requestRecord.user_agent) {
        if (requestRecord.user_agent.includes('Chrome')) browserInfo = 'Chrome';
        else if (requestRecord.user_agent.includes('Safari')) browserInfo = 'Safari';
        else if (requestRecord.user_agent.includes('Firefox')) browserInfo = 'Firefox';
        else if (requestRecord.user_agent.includes('Edge')) browserInfo = 'Edge';
      }

      // Calculate time since request
      const timeSinceRequest = Date.now() - new Date(requestRecord.created_at).getTime();
      const daysSince = Math.floor(timeSinceRequest / (1000 * 60 * 60 * 24));

      return {
        id: requestRecord.id,
        email: requestRecord.email,
        ip_address: requestRecord.ip_address,
        user_agent: requestRecord.user_agent,
        browser_info: browserInfo,
        access_granted: requestRecord.access_granted,
        user_id: requestRecord.user_id,
        created_at: requestRecord.created_at,
        approved_at: requestRecord.approved_at,
        notes: requestRecord.notes,
        status: requestStatus,
        days_since_request: daysSince,
        has_account: !!requestRecord.user_id,
      };
    });

    // Calculate summary statistics for this query
    const summary = {
      total: count || 0,
      approved: enhancedRequests.filter((request) => request.access_granted).length,
      active_users: enhancedRequests.filter((request) => request.has_account).length,
      failed: enhancedRequests.filter((request) => !request.access_granted).length,
      pending_signup: enhancedRequests.filter((request) => request.access_granted && !request.has_account).length,
    };

    // Log admin access

    return NextResponse.json({
      success: true,
      requests: enhancedRequests,
      summary,
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
        endpoint: '/api/admin/beta/requests',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/beta/requests GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch beta requests' },
      { status: 500 }
    );
  }
}
