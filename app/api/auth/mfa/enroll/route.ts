import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkMfaRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

/**
 * MFA Enrollment API
 *
 * Handles Multi-Factor Authentication enrollment using Supabase's MFA functionality
 * Supports TOTP (Time-based One-Time Password) authentication
 */

export async function POST(request: NextRequest) {
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

    // Enroll in MFA - this generates a QR code and secret
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: user.email || 'Rowan Account',
    });

    if (error) {
      logger.error('MFA enrollment error:', error, {
        component: 'MFAEnrollAPI',
        action: 'ENROLL',
      });
      return NextResponse.json(
        { error: 'Failed to enroll in MFA: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        type: data.type,
        qr_code: data.totp?.qr_code,
        secret: data.totp?.secret,
        uri: data.totp?.uri,
      },
    });
  } catch (error) {
    logger.error('Error in MFA enrollment:', error, {
      component: 'MFAEnrollAPI',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // List all MFA factors for the user
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      logger.error('MFA list factors error:', error, {
        component: 'MFAEnrollAPI',
        action: 'LIST_FACTORS',
      });
      return NextResponse.json(
        { error: 'Failed to list MFA factors: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        factors: data.totp || [],
        is_enrolled: (data.totp || []).some((factor: any) => factor.status === 'verified'),
      },
    });
  } catch (error) {
    logger.error('Error listing MFA factors:', error, {
      component: 'MFAEnrollAPI',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}