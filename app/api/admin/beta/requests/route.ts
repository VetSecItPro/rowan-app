import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'approved', 'pending', 'failed', or null for all
    const search = searchParams.get('search') || '';

    // Build query with enhanced data
    let query = supabase
      .from('beta_access_requests')
      .select(`
        id,
        email,
        password_attempt,
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
    const enhancedRequests = (requests || []).map((request: any) => {
      // Determine request status
      let requestStatus: 'active_user' | 'approved_pending' | 'failed';
      if (request.access_granted && request.user_id) {
        requestStatus = 'active_user';
      } else if (request.access_granted) {
        requestStatus = 'approved_pending';
      } else {
        requestStatus = 'failed';
      }

      // Parse user agent for browser info
      let browserInfo = 'Unknown';
      if (request.user_agent) {
        if (request.user_agent.includes('Chrome')) browserInfo = 'Chrome';
        else if (request.user_agent.includes('Safari')) browserInfo = 'Safari';
        else if (request.user_agent.includes('Firefox')) browserInfo = 'Firefox';
        else if (request.user_agent.includes('Edge')) browserInfo = 'Edge';
      }

      // Calculate time since request
      const timeSinceRequest = Date.now() - new Date(request.created_at).getTime();
      const daysSince = Math.floor(timeSinceRequest / (1000 * 60 * 60 * 24));

      return {
        id: request.id,
        email: request.email,
        password_attempt: request.password_attempt,
        ip_address: request.ip_address,
        user_agent: request.user_agent,
        browser_info: browserInfo,
        access_granted: request.access_granted,
        user_id: request.user_id,
        created_at: request.created_at,
        approved_at: request.approved_at,
        notes: request.notes,
        status: requestStatus,
        days_since_request: daysSince,
        has_account: !!request.user_id,
      };
    });

    // Calculate summary statistics for this query
    const summary = {
      total: count || 0,
      approved: enhancedRequests.filter((r: any) => r.access_granted).length,
      active_users: enhancedRequests.filter((r: any) => r.has_account).length,
      failed: enhancedRequests.filter((r: any) => !r.access_granted).length,
      pending_signup: enhancedRequests.filter((r: any) => r.access_granted && !r.has_account).length,
    };

    // Log admin access
    console.log(`Admin beta requests accessed by: ${sessionData.email} from IP: ${ip}, Page: ${page}, Filter: ${status || 'all'}`);

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
    console.error('[API] /api/admin/beta/requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beta requests' },
      { status: 500 }
    );
  }
}