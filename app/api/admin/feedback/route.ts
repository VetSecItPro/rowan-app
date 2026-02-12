import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FeedbackStatus, FeedbackType } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { sanitizeSearchInput } from '@/lib/utils';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as FeedbackStatus | null;
    const feedback_type = searchParams.get('feedback_type') as FeedbackType | null;
    const search = searchParams.get('search');

    // Fetch feedback directly with supabaseAdmin (bypasses RLS)
    let query = supabaseAdmin
      .from('feedback_submissions')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (feedback_type) {
      query = query.eq('feedback_type', feedback_type);
    }

    if (search) {
      // Search in description and feature_name (sanitized to prevent SQL injection)
      const sanitizedSearch = sanitizeSearchInput(search);
      if (sanitizedSearch) {
        query = query.or(`description.ilike.%${sanitizedSearch}%,feature_name.ilike.%${sanitizedSearch}%`);
      }
    }

    const { data, error } = await query.limit(10000);

    if (error) {
      logger.error('Error fetching feedback:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch feedback data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Error in admin feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
