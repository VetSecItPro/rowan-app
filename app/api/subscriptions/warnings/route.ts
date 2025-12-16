/**
 * Limit Warnings API Route
 * GET /api/subscriptions/warnings - Get usage warnings for approaching limits
 *
 * IMPORTANT: Server-side only - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLimitWarnings } from '@/lib/services/feature-access-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * GET handler - Get warnings for limits that user is approaching (>80% usage)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameter for threshold (default 0.8 = 80%)
    const searchParams = request.nextUrl.searchParams;
    const thresholdParam = searchParams.get('threshold');
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.8;

    // Validate threshold
    if (isNaN(threshold) || threshold <= 0 || threshold > 1) {
      return NextResponse.json(
        { error: 'Threshold must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Get limit warnings
    const warnings = await getLimitWarnings(user.id, threshold);

    return NextResponse.json(warnings, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    logger.error('Error fetching limit warnings:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch limit warnings' },
      { status: 500 }
    );
  }
}
