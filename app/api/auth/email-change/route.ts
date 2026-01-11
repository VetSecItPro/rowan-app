import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendEmailChangeEmail, type EmailChangeData } from '@/lib/services/email-service';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { buildAppUrl } from '@/lib/utils/app-url';

export const dynamic = 'force-dynamic';

const EmailChangeRequestSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`email-change:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many email change requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to change your email.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = EmailChangeRequestSchema.parse(body);
    const { newEmail } = validatedData;
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // Check if new email is the same as current
    if (normalizedNewEmail === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from your current email.' },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedNewEmail)
      .single();

    if (existingUser && !checkError) {
      return NextResponse.json(
        { error: 'This email address is already in use by another account.' },
        { status: 409 }
      );
    }

    // Get user's name for the email
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing email change tokens for this user
    await supabaseAdmin
      .from('email_change_tokens')
      .delete()
      .eq('user_id', user.id);

    // Store the email change token
    const { error: tokenError } = await supabaseAdmin
      .from('email_change_tokens')
      .insert({
        user_id: user.id,
        current_email: user.email,
        new_email: normalizedNewEmail,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (tokenError) {
      logger.error('Failed to store email change token:', tokenError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to initiate email change. Please try again.' },
        { status: 500 }
      );
    }

    // Send verification email to the NEW email address
    const verificationUrl = buildAppUrl('/auth/verify-email-change', { token });

    const emailData: EmailChangeData = {
      currentEmail: user.email!,
      newEmail: normalizedNewEmail,
      verificationUrl,
      userName: userData?.name || 'there',
    };

    const emailResult = await sendEmailChangeEmail(emailData);

    if (!emailResult.success) {
      logger.error('Failed to send email change email:', undefined, {
        component: 'api-route',
        action: 'api_request',
        details: emailResult.error
      });
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('Email change verification sent successfully', {
      component: 'api-route',
      action: 'email_change',
      userId: user.id,
      newEmail: normalizedNewEmail.substring(0, 3) + '***'
    });

    return NextResponse.json({
      success: true,
      message: 'A verification email has been sent to your new email address. Please check your inbox to confirm the change.'
    });

  } catch (error) {
    logger.error('Email change error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
