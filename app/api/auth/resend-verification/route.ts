import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { authRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { sendEmailVerificationEmail } from '@/lib/services/email-service';
import { buildAppUrl } from '@/lib/utils/app-url';
import crypto from 'crypto';

/**
 * POST /api/auth/resend-verification
 *
 * Resends the email verification link to the logged-in user.
 * Uses custom Resend-based email service instead of Supabase's built-in email.
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

    // Generate a secure verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate any existing tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', user.id);

    // Store the new verification token
    const { error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        email: user.email!,
        token: verificationToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      logger.error('Failed to store verification token', tokenError, {
        component: 'api-resend-verification',
        action: 'store_token',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to generate verification link. Please try again.' },
        { status: 500 }
      );
    }

    // Build verification URL
    // Note: /verify-email is the correct path because (auth) is a Next.js route group
    const verificationUrl = buildAppUrl('/verify-email', { token: verificationToken });

    // Get user's name from metadata or database
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || 'there';

    // Send verification email using Resend
    const emailResult = await sendEmailVerificationEmail({
      userEmail: user.email!,
      verificationUrl,
      userName,
    });

    if (!emailResult.success) {
      logger.error('Failed to send verification email', undefined, {
        component: 'api-resend-verification',
        action: 'send_email',
        userId: user.id,
        error: emailResult.error,
      });
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
