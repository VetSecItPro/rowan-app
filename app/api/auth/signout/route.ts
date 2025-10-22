import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

// Rate limiting: 10 signout attempts per minute (generous, but prevents abuse)
const signoutRateLimit = ratelimit({
  name: 'auth_signout',
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

export async function POST(request: NextRequest) {
  try {
    // Extract IP for rate limiting
    const ip = extractIP(request.headers);

    // Apply rate limiting
    const { success, limit, remaining, resetTime } = await signoutRateLimit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many signout requests. Please try again later.',
          resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          }
        }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Sign out user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Signout error:', error);
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
          'X-RateLimit-Reset': resetTime.toString(),
        }
      }
    );

  } catch (error) {
    // Generic error handler
    console.error('Signout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}