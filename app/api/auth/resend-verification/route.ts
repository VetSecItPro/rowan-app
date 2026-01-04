import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/resend-verification
 *
 * Resends the email verification link to the logged-in user.
 * Rate limited to prevent abuse.
 */
export async function POST(request: NextRequest) {
  // CRITICAL: Prevent any execution during build time
  if (!request ||
      !request.headers ||
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NODE_ENV === 'test') {
    return NextResponse.json({ error: 'Build time - route disabled' }, { status: 503 });
  }

  try {
    // Rate limiting - strict limit for verification emails (3 per hour)
    const ip = extractIP(request.headers);
    const { success, limit, remaining, reset } = authRateLimit
      ? await authRateLimit.limit(`resend-verification:${ip}`)
      : { success: true, limit: 3, remaining: 2, reset: Date.now() + 3600000 };

    if (!success) {
      const minutesUntilReset = Math.ceil((reset - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many verification requests. Please wait ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} and try again.` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Get the current session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to request a verification email.' },
        { status: 401 }
      );
    }

    // Check if email is already verified
    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Your email is already verified.', alreadyVerified: true },
        { status: 400 }
      );
    }

    // Resend the verification email using Supabase's built-in method
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
    });

    if (resendError) {
      logger.error('Failed to resend verification email', resendError, {
        component: 'api-resend-verification',
        action: 'resend',
        userId: user.id,
      });

      // Handle specific error cases
      if (resendError.message.includes('rate')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a few minutes before trying again.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    logger.info('Verification email resent', {
      component: 'api-resend-verification',
      action: 'resend_success',
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  } catch (error) {
    logger.error('Resend verification error', error instanceof Error ? error : new Error(String(error)), {
      component: 'api-resend-verification',
      action: 'resend',
    });

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
