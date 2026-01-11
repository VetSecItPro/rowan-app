import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPasswordResetEmail, type PasswordResetData } from '@/lib/services/email-service';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { buildAppUrl } from '@/lib/utils/app-url';

export const dynamic = 'force-dynamic';

const PasswordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`password-reset:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { email } = PasswordResetRequestSchema.parse(body);

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    // Only process if user exists (but always return success for security)
    if (userData && !userError) {
      // Generate token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // CRITICAL: Insert new token first (this is the critical path)
      // Don't run delete in parallel - it can delete the newly inserted token!
      const { error: tokenError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          user_id: userData.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      // Fire-and-forget: cleanup old tokens AFTER insert succeeds
      // This prevents race condition where delete removes the new token
      if (!tokenError) {
        void (async () => {
          try {
            await supabaseAdmin
              .from('password_reset_tokens')
              .delete()
              .eq('user_id', userData.id)
              .neq('token', resetToken);
          } catch (err) {
            logger.error('Failed to cleanup old tokens:', err, {
              component: 'api-route',
              action: 'api_request'
            });
          }
        })();
      }

      const tokenResult = { error: tokenError };

      // Only send email if token was stored successfully
      if (!tokenResult.error) {
        const resetUrl = buildAppUrl('/reset-password', { token: resetToken });
        const userAgent = request.headers.get('user-agent') || 'Unknown browser';

        const emailData: PasswordResetData = {
          userEmail: email,
          resetUrl: resetUrl,
          userName: userData.name || 'there',
          ipAddress: ip,
          userAgent: userAgent
        };

        // OPTIMIZATION: Fire-and-forget email - don't await
        sendPasswordResetEmail(emailData)
          .then(result => {
            if (result.success) {
              logger.info('Password reset email sent', {
                component: 'api-route',
                action: 'password_reset',
                email: email.substring(0, 3) + '***'
              });
            } else {
              logger.error('Failed to send password reset email', {
                component: 'api-route',
                action: 'api_request',
                details: result.error
              });
            }
          })
          .catch(err => {
            logger.error('Password reset email error:', err, {
              component: 'api-route',
              action: 'api_request'
            });
          });
      } else {
        logger.error('Failed to store reset token:', tokenResult.error, {
          component: 'api-route',
          action: 'api_request'
        });
      }
    }

    // Return success immediately (email sends in background)
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
    rateLimit: '5 requests per hour per IP address',
    security: [
      'Rate limiting prevents brute force attacks',
      'User enumeration protection (always returns success)',
      'Secure token generation with 1-hour expiration',
      'Custom branded email templates'
    ]
  });
}
