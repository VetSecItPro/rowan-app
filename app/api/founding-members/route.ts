/**
 * API Route: Founding Members Status
 * GET /api/founding-members
 *
 * Returns the current founding member count and spots remaining
 * Public endpoint - no auth required (for pricing page display)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Returns founding member count and remaining spots */
export async function GET(request: NextRequest) {
  try {
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Get the founding member counter
    const { data, error } = await supabase
      .from('founding_member_counter')
      .select('current_count, max_count')
      .eq('id', 1)
      .single();

    if (error) {
      // If table doesn't exist yet (migration not run), return defaults
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json({
          currentCount: 0,
          maxCount: 1000,
          spotsRemaining: 1000,
          isFull: false,
        });
      }
      throw error;
    }

    const spotsRemaining = data.max_count - data.current_count;

    return NextResponse.json({
      currentCount: data.current_count,
      maxCount: data.max_count,
      spotsRemaining,
      isFull: spotsRemaining <= 0,
    });
  } catch (error) {
    logger.error('Error fetching founding member status:', error, { component: 'api-route', action: 'founding_members' });

    // Return safe defaults on error
    return NextResponse.json({
      currentCount: 0,
      maxCount: 1000,
      spotsRemaining: 1000,
      isFull: false,
    });
  }
}
