import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkMfaRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

/**
 * MFA Unenrollment API
 *
 * Handles removal of MFA factors from user accounts
 */

const UnenrollSchema = z.object({
  factorId: z.string(),
});

/** Removes an MFA factor from the user's account */
export async function DELETE(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limit check
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkMfaRateLimit(ip);
    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { factorId } = UnenrollSchema.parse(body);

    // Unenroll from MFA
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      logger.error('MFA unenrollment error:', error, {
        component: 'MFAUnenrollAPI',
        action: 'UNENROLL',
      });
      return NextResponse.json(
        { error: 'Failed to disable MFA. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error in MFA unenrollment:', error, {
      component: 'MFAUnenrollAPI',
      action: 'DELETE',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Removes an MFA factor (alias for DELETE, kept for compatibility) */
export async function POST(request: NextRequest) {
  // Also support POST for compatibility
  return DELETE(request);
}