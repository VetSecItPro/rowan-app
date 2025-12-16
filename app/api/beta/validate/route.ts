import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import crypto from 'crypto';

// Security: Beta password moved to environment variable (CRITICAL-3 fix)
// Set BETA_PASSWORD in Vercel environment variables
const MAX_BETA_USERS = 30;

/**
 * Constant-time string comparison to prevent timing attacks
 * Returns true if strings are equal, false otherwise
 */
function timingSafeCompare(a: string, b: string): boolean {
  // Convert to buffers for comparison
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // If lengths differ, still do a comparison to maintain constant time
  // but compare against a dummy buffer of the correct length
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself to maintain constant timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/beta/validate
 * Validate beta password and check user capacity
 */
export async function POST(req: NextRequest) {
  try {
    // Validate that BETA_PASSWORD is configured (runtime check)
    const BETA_PASSWORD = process.env.BETA_PASSWORD;
    if (!BETA_PASSWORD) {
      throw new Error('BETA_PASSWORD environment variable is required');
    }

    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for public access
    const supabase = await createClient();

    // Use timing-safe comparison to prevent timing attacks
    const isValidPassword = timingSafeCompare(password, BETA_PASSWORD);

    // Log the beta access attempt (password NOT stored for security)
    const { error: logError } = await supabase
      .from('beta_access_requests')
      .insert({
        email: null, // Will be filled when user actually signs up
        // password_attempt intentionally omitted - never store plaintext passwords
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || null,
        access_granted: isValidPassword,
        created_at: new Date().toISOString(),
      });

    // Beta access attempts logged to database for audit trail

    // Check password (using pre-computed timing-safe result)
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid beta password. Please check with your invitation source.'
        },
        { status: 401 }
      );
    }

    // Check current beta user count
    const { count: betaUserCount, error: countError } = await supabase
      .from('beta_access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('access_granted', true)
      .not('user_id', 'is', null);

    if (countError) {
      throw new Error(`Failed to check beta user count: ${countError.message}`);
    }

    // Check if we've reached capacity
    if (betaUserCount !== null && betaUserCount >= MAX_BETA_USERS) {
      return NextResponse.json(
        {
          success: false,
          error: `Beta program is currently at capacity (${MAX_BETA_USERS} users). Join our launch notification list to be notified when we open more spots!`,
          at_capacity: true
        },
        { status: 403 }
      );
    }

    // Increment daily analytics for beta requests
    const today = new Date().toISOString().split('T')[0];
    const { error: analyticsError } = await supabase
      .rpc('increment_beta_requests', { target_date: today });

    // Analytics increment failures are non-critical

    // Success response
    return NextResponse.json({
      success: true,
      message: `Welcome to Rowan Beta! You're user ${(betaUserCount || 0) + 1} of ${MAX_BETA_USERS}.`,
      slots_remaining: MAX_BETA_USERS - (betaUserCount || 0) - 1,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/beta/validate',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    // Error already captured by Sentry above
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}