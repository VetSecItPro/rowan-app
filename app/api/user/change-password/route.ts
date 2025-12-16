import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

// Password validation schema
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * POST /api/user/change-password
 * Change password for authenticated user
 * Requires current password verification
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkAuthRateLimit(`change-password:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many password change attempts. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to change your password.' },
        { status: 401 }
      );
    }

    // Set user context for Sentry
    setSentryUser(session.user);

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = ChangePasswordSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.issues[0]?.message || 'Invalid input' },
          { status: 400 }
        );
      }
      throw error;
    }

    const { currentPassword, newPassword } = validatedData;

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: currentPassword,
    });

    if (verifyError) {
      logger.warn('Password change failed - incorrect current password', {
        component: 'api-route',
        action: 'api_request',
        userId: session.user.id.substring(0, 8) + '...'
      });
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password using Supabase auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      logger.error('Failed to update password:', updateError, {
        component: 'api-route',
        action: 'api_request'
      });

      // Check for specific error types
      if (updateError.message.includes('same as')) {
        return NextResponse.json(
          { error: 'New password must be different from your current password' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('Password changed successfully', {
      component: 'api-route',
      action: 'api_request',
      userId: session.user.id.substring(0, 8) + '...'
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/user/change-password',
        method: 'POST',
      },
    });
    logger.error('[API] /api/user/change-password error:', error, {
      component: 'api-route',
      action: 'api_request'
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
