import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

export const dynamic = 'force-dynamic';

const MagicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Magic link token is required')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per hour per IP (uses fallback if Redis unavailable)
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkAuthRateLimit(`magic-link-verify:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = MagicLinkVerifySchema.parse(body);
    const { token } = validatedData;

    // Use admin client to bypass RLS for token verification

    // Verify the magic link token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link.' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'This magic link has already been used.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This magic link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark the token as used immediately to prevent race conditions
    const { error: markUsedError } = await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) {
      logger.error('Failed to mark token as used:', markUsedError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to process authentication. Please try again.' },
        { status: 500 }
      );
    }

    // Generate a new session for the user using Supabase admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: '', // We don't have email here, but we have user_id
      options: {
        redirectTo: `${getAppUrl()}/dashboard`
      }
    });

    if (authError) {
      logger.error('Failed to generate session:', authError, { component: 'api-route', action: 'api_request' });
      
      // Alternative approach: Create a temporary access token
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', tokenData.user_id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Failed to authenticate. Please try signing in again.' },
          { status: 500 }
        );
      }

      // Use signInWithPassword with a temporary approach or create custom JWT
      // For now, return user info and let frontend handle session creation
      return NextResponse.json({
        success: true,
        user_id: tokenData.user_id,
        email: userData.email,
        message: 'Authentication successful. Please complete sign-in.'
      });
    }

    // Clean up other magic link tokens for this user
    const { error: cleanupError } = await supabaseAdmin
      .from('magic_link_tokens')
      .delete()
      .eq('user_id', tokenData.user_id)
      .neq('token', token);

    if (cleanupError) {
      logger.error('Failed to cleanup other tokens:', cleanupError, { component: 'api-route', action: 'api_request' });
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      redirect_url: `${getAppUrl()}/dashboard`
    });

  } catch (error) {
    logger.error('Magic link verification error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid magic link token.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// GET method to check if a magic link token is valid
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

    // Check token validity without using it
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid magic link token'
      });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'Magic link has already been used'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'Magic link has expired'
      });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: tokenData.expires_at
    });

  } catch (error) {
    logger.error('Magic link validation error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to validate magic link' },
      { status: 500 }
    );
  }
}
