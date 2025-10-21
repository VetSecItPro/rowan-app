import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * MFA Verification API
 *
 * Handles verification of TOTP codes during MFA enrollment and login
 */

const VerifyCodeSchema = z.object({
  factorId: z.string(),
  code: z.string().length(6),
  challengeId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { factorId, code, challengeId } = VerifyCodeSchema.parse(body);

    let result;

    if (challengeId) {
      // This is for verifying during login (challenge verification)
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) {
        console.error('MFA challenge verification error:', error);
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      result = data;
    } else {
      // This is for verifying during enrollment
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        code,
      });

      if (error) {
        console.error('MFA enrollment verification error:', error);
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'MFA verification successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in MFA verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}