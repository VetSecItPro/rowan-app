import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const EmailChangeVerifySchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/** Verifies a new email address with a confirmation token */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`email-change-verify:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = EmailChangeVerifySchema.parse(body);
    const { token } = validatedData;

    // Verify the email change token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_change_tokens')
      .select('user_id, current_email, new_email, expires_at, confirmed_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link.' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (tokenData.confirmed_at) {
      return NextResponse.json(
        { error: 'This verification link has already been used.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This verification link has expired. Please request a new email change.' },
        { status: 400 }
      );
    }

    // Check if new email is still available (could have been taken in the meantime)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', tokenData.new_email)
      .neq('id', tokenData.user_id)
      .single();

    if (existingUser && !checkError) {
      return NextResponse.json(
        { error: 'This email address is now in use by another account.' },
        { status: 409 }
      );
    }

    // Update the user's email in the database
    const { error: updateDbError } = await supabaseAdmin
      .from('users')
      .update({
        email: tokenData.new_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id);

    if (updateDbError) {
      logger.error('Failed to update email in database:', updateDbError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to update email. Please try again.' },
        { status: 500 }
      );
    }

    // Update the user's email in Supabase Auth
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email: tokenData.new_email, email_confirm: true }
    );

    if (authUpdateError) {
      logger.error('Failed to update auth email:', authUpdateError, { component: 'api-route', action: 'api_request' });
      // Rollback database change
      await supabaseAdmin
        .from('users')
        .update({
          email: tokenData.current_email,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.user_id);

      return NextResponse.json(
        { error: 'Failed to update email. Please try again.' },
        { status: 500 }
      );
    }

    // Mark the token as confirmed
    const { error: markConfirmedError } = await supabaseAdmin
      .from('email_change_tokens')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('token', token);

    if (markConfirmedError) {
      logger.error('Failed to mark token as confirmed:', markConfirmedError, { component: 'api-route', action: 'api_request' });
      // Don't fail the request, email was already updated
    }

    // Clean up any other email change tokens for this user
    const { error: cleanupError } = await supabaseAdmin
      .from('email_change_tokens')
      .delete()
      .eq('user_id', tokenData.user_id)
      .neq('token', token);

    if (cleanupError) {
      logger.error('Failed to cleanup other tokens:', cleanupError, { component: 'api-route', action: 'api_request' });
      // Don't fail the request
    }

    logger.info('Email change completed successfully', {
      component: 'api-route',
      action: 'email_change_verify',
      userId: tokenData.user_id,
      oldEmail: tokenData.current_email?.substring(0, 3) + '***',
      newEmail: tokenData.new_email.substring(0, 3) + '***'
    });

    return NextResponse.json({
      success: true,
      message: 'Your email has been successfully updated. Please sign in again with your new email.',
      newEmail: tokenData.new_email
    });

  } catch (error) {
    logger.error('Email change verification error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid verification link.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/** Checks the validity of a pending email change token */
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
      .from('email_change_tokens')
      .select('current_email, new_email, expires_at, confirmed_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid verification link'
      });
    }

    // Check if token has been used
    if (tokenData.confirmed_at) {
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
        error: 'This verification link has expired'
      });
    }

    return NextResponse.json({
      valid: true,
      currentEmail: tokenData.current_email,
      newEmail: tokenData.new_email,
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
