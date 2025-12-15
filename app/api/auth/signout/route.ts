import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Extract IP for rate limiting
    const ip = extractIP(request.headers);

    // Apply rate limiting (10 signout attempts per 10 seconds - generous but prevents abuse)
    const { success, limit, remaining, reset } = apiRateLimit
      ? await apiRateLimit.limit(ip)
      : { success: true, limit: 10, remaining: 9, reset: Date.now() + 600000 };

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many signout requests. Please try again later.',
          resetTime: reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Sign out user
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Signout error:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to sign out. Please try again.' },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      { success: true, message: 'Signed out successfully' },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );

  } catch (error) {
    // Generic error handler
    logger.error('Signout API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}