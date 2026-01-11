import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

/**
 * GET /api/auth/verify-email?token=xxx
 * Check if an email verification token is valid
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: 'Verification token is required'
      });
    }

    // Look up the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid verification link'
      });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'This verification link has already been used'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'This verification link has expired. Please request a new one.'
      });
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email,
      expiresAt: tokenData.expires_at
    });

  } catch (error) {
    logger.error('Email verification validation error', error instanceof Error ? error : new Error(String(error)), {
      component: 'api-verify-email',
      action: 'validate',
    });
    return NextResponse.json(
      { valid: false, error: 'Failed to validate verification link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/verify-email
 * Verify an email using a token and mark the user's email as confirmed
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkAuthRateLimit(`verify-email:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = VerifyEmailSchema.parse(body);
    const { token } = validatedData;

    // Look up the token using admin client
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('id, user_id, email, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification link.' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json(
        { success: false, error: 'This verification link has already been used.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'This verification link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark the token as used
    const { error: markUsedError } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (markUsedError) {
      logger.error('Failed to mark verification token as used', markUsedError, {
        component: 'api-verify-email',
        action: 'mark_used',
        userId: tokenData.user_id,
      });
    }

    // Update the user's email_confirmed_at in auth.users using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (updateError) {
      logger.error('Failed to confirm email in auth', updateError, {
        component: 'api-verify-email',
        action: 'confirm_email',
        userId: tokenData.user_id,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to verify email. Please try again.' },
        { status: 500 }
      );
    }

    // Clean up other verification tokens for this user
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', tokenData.user_id);

    logger.info('Email verified successfully', {
      component: 'api-verify-email',
      action: 'verify_success',
      userId: tokenData.user_id,
      email: tokenData.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now access all features.',
    });

  } catch (error) {
    logger.error('Email verification error', error instanceof Error ? error : new Error(String(error)), {
      component: 'api-verify-email',
      action: 'verify',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification token.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
