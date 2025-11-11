import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

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

    // Get pagination parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'approved', 'pending', or null for all

    let query = supabase
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
    const requests = (betaRequests || []).map((request: any) => ({
      id: request.id,
      email: request.email,
      password_attempt: request.password_attempt,
      ip_address: request.ip_address,
      user_agent: request.user_agent,
      access_granted: request.access_granted,
      user_id: request.user_id,
      created_at: request.created_at,
      approved_at: request.approved_at,
      notes: request.notes,
    }));

    // Get summary statistics
    const { data: stats, error: statsError } = await supabase
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

    // Log admin access
    console.log(`Admin beta requests accessed by: ${sessionData.email} from IP: ${ip}`);

    return NextResponse.json({
      success: true,
      requests,
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