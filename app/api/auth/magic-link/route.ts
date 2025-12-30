import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import { sendMagicLinkEmail, type MagicLinkData } from '@/lib/services/email-service';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const MagicLinkRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP (uses fallback if Redis unavailable)
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`magic-link:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many magic link requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = MagicLinkRequestSchema.parse(body);
    const { email } = validatedData;

    // Create Supabase client
    const supabase = await createClient();

    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent user enumeration attacks
    // But only send email if user actually exists
    if (userData && !userError) {
      try {
        // Generate a secure magic link token
        const magicToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

        // Store the magic link token in the database
        const { error: tokenError } = await supabase
          .from('magic_link_tokens')
          .insert({
            user_id: userData.id,
            token: magicToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (tokenError) {
          logger.error('Failed to store magic link token:', tokenError, { component: 'api-route', action: 'api_request' });
          // Still return success to prevent information leakage
        } else {
          // Send magic link email using our custom template
          const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${magicToken}`;
          
          // Get user agent and IP for security info
          const userAgent = request.headers.get('user-agent') || 'Unknown browser';
          
          const emailData: MagicLinkData = {
            userEmail: email,
            magicLinkUrl: magicLinkUrl,
            userName: userData.name || 'there',
            ipAddress: ip,
            userAgent: userAgent
          };

          // Send email in background (non-blocking for fast response)
          sendMagicLinkEmail(emailData).then((emailResult) => {
            if (!emailResult.success) {
              logger.error('Failed to send magic link email:', undefined, { component: 'api-route', action: 'api_request', details: emailResult.error });
            }
          }).catch((err) => {
            logger.error('Magic link email error:', err, { component: 'api-route', action: 'api_request' });
          });
        }
      } catch (emailError) {
        logger.error('Magic link email error:', emailError, { component: 'api-route', action: 'api_request' });
        // Still return success to user
      }
    }

    // Always return success message to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we\'ve sent you a magic link to sign in.'
    });

  } catch (error) {
    logger.error('Magic link error:', error, { component: 'api-route', action: 'api_request' });

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
    message: 'Magic Link Authentication API',
    method: 'POST',
    description: 'Request a magic link for passwordless sign-in',
    requestBody: {
      email: 'string (required) - User email address'
    },
    rateLimit: '3 requests per 15 minutes per IP address',
    tokenExpiry: '15 minutes',
    security: [
      'Rate limiting prevents abuse',
      'User enumeration protection (always returns success)',
      'Secure token generation with short expiration',
      'Single-use tokens',
      'Custom branded email templates'
    ]
  });
}
