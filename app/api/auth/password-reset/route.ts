import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail, type PasswordResetData } from '@/lib/services/email-service';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const PasswordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP (uses fallback if Redis unavailable)
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`password-reset:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = PasswordResetRequestSchema.parse(body);
    const { email } = validatedData;

    // Create Supabase client
    const supabase = createClient();

    // Check if user exists (but don't reveal this information for security)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent user enumeration attacks
    // But only send email if user actually exists
    if (userData && !userError) {
      try {
        // Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store the reset token in the database
        const { error: tokenError } = await supabase
          .from('password_reset_tokens')
          .insert({
            user_id: userData.id,
            token: resetToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (tokenError) {
          logger.error('Failed to store reset token:', tokenError, { component: 'api-route', action: 'api_request' });
          // Still return success to prevent information leakage
        } else {
          // Send password reset email using our custom template
          const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
          
          // Get user agent and IP for security info
          const userAgent = request.headers.get('user-agent') || 'Unknown browser';
          
          const emailData: PasswordResetData = {
            userEmail: email,
            resetUrl: resetUrl,
            userName: userData.name || 'there',
            ipAddress: ip,
            userAgent: userAgent
          };

          const emailResult = await sendPasswordResetEmail(emailData);
          
          if (!emailResult.success) {
            logger.error('Failed to send password reset email:', undefined, { component: 'api-route', action: 'api_request', details: emailResult.error });
            // Still return success to user
          }
        }
      } catch (emailError) {
        logger.error('Password reset email error:', emailError, { component: 'api-route', action: 'api_request' });
        // Still return success to user
      }
    }

    // Always return success message to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we\'ve sent you a password reset link.'
    });

  } catch (error) {
    logger.error('Password reset error:', error, { component: 'api-route', action: 'api_request' });

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

// GET method to provide API documentation
export async function GET() {
  return NextResponse.json({
    message: 'Password Reset API',
    method: 'POST',
    description: 'Request a password reset link for an email address',
    requestBody: {
      email: 'string (required) - User email address'
    },
    rateLimit: '3 requests per hour per IP address',
    security: [
      'Rate limiting prevents brute force attacks',
      'User enumeration protection (always returns success)',
      'Secure token generation with 1-hour expiration',
      'Custom branded email templates'
    ]
  });
}
