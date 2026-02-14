import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const PasswordResetVerifySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
});

/** Verifies a password reset token and sets a new password */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP (uses fallback if Redis unavailable)
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`password-reset-verify:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = PasswordResetVerifySchema.parse(body);
    const { token, password } = validatedData;

    // Use admin client to bypass RLS for token verification

    // Verify the reset token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'This reset link has already been used.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update the user's password using Supabase admin client
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: password }
    );

    if (passwordError) {
      logger.error('Failed to update password:', passwordError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // OPTIMIZATION: Fire-and-forget cleanup operations (password already updated successfully)
    // Mark token as used and cleanup other tokens in parallel - don't block response
    Promise.all([
      supabaseAdmin
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token),
      supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', tokenData.user_id)
        .neq('token', token)
    ]).catch(err => {
      logger.error('Token cleanup error:', err, { component: 'api-route', action: 'api_request' });
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.'
    });

  } catch (error) {
    logger.error('Password reset verification error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/** Checks the validity of a password reset token without consuming it */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check token validity
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid reset token'
      });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'Reset link has already been used'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'Reset link has expired'
      });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: tokenData.expires_at
    });

  } catch (error) {
    logger.error('Token validation error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
