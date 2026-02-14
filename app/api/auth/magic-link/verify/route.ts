import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

export const dynamic = 'force-dynamic';

const MagicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Magic link token is required')
});

/** Verifies a magic link token and returns a Supabase auth URL */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: Use API rate limit (10/10s) instead of auth rate limit (10/hour)
    // Verification with a valid token should be more lenient than requesting new links
    // The token itself provides security - if someone has a valid token, let them verify it
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitPassed } = await checkApiRateLimit(`magic-link-verify:${ip}`);

    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token } = MagicLinkVerifySchema.parse(body);

    // Get token data
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

    // Check if already used
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: 'This magic link has already been used.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > new Date(tokenData.expires_at)) {
      return NextResponse.json(
        { error: 'This magic link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get user email (needed for Supabase link generation)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found. Please try again.' },
        { status: 400 }
      );
    }

    // Mark token as used and generate Supabase link in parallel
    const [, linkResult] = await Promise.all([
      // Mark as used (fire-and-forget, don't block on result)
      supabaseAdmin
        .from('magic_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token),
      // Generate Supabase magic link
      // IMPORTANT: Redirect to /login with redirectTo param so hash tokens are processed
      // The login page has the code to detect #access_token and call setSession()
      supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.email,
        options: {
          redirectTo: `${getAppUrl()}/login?redirectTo=/dashboard`
        }
      })
    ]);

    if (linkResult.error || !linkResult.data?.properties?.action_link) {
      logger.error('Failed to generate Supabase link:', linkResult.error, {
        component: 'api-route',
        action: 'api_request'
      });
      return NextResponse.json(
        { error: 'Failed to complete authentication. Please try again.' },
        { status: 500 }
      );
    }

    // Fire-and-forget: cleanup other tokens for this user (don't block response)
    void (async () => {
      try {
        await supabaseAdmin
          .from('magic_link_tokens')
          .delete()
          .eq('user_id', tokenData.user_id)
          .neq('token', token);
      } catch (err) {
        logger.error('Failed to cleanup tokens:', err, {
          component: 'api-route',
          action: 'api_request'
        });
      }
    })();

    logger.info('Magic link verified successfully', {
      component: 'api-route',
      action: 'magic_link_verify',
      userId: tokenData.user_id
    });

    // Return Supabase action URL
    return NextResponse.json({
      success: true,
      action_url: linkResult.data.properties.action_link
    });

  } catch (error) {
    logger.error('Magic link verification error:', error, {
      component: 'api-route',
      action: 'api_request'
    });

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

/** Checks the validity of a magic link token without consuming it */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ valid: false, error: 'Invalid magic link token' });
    }

    if (tokenData.used_at) {
      return NextResponse.json({ valid: false, error: 'Magic link has already been used' });
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      return NextResponse.json({ valid: false, error: 'Magic link has expired' });
    }

    return NextResponse.json({ valid: true, expiresAt: tokenData.expires_at });

  } catch (error) {
    logger.error('Magic link validation error:', error, {
      component: 'api-route',
      action: 'api_request'
    });
    return NextResponse.json({ error: 'Failed to validate magic link' }, { status: 500 });
  }
}
