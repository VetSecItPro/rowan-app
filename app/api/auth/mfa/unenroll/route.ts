import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkMfaRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * MFA Unenrollment API
 *
 * Handles removal of MFA factors from user accounts
 */

const UnenrollSchema = z.object({
  factorId: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
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
      console.error('MFA unenrollment error:', error);
      return NextResponse.json(
        { error: 'Failed to disable MFA: ' + error.message },
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

    console.error('Error in MFA unenrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Also support POST for compatibility
  return DELETE(request);
}