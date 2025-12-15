import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInvitation } from '@/lib/services/invitations-service';
import { sendSpaceInvitationEmail } from '@/lib/services/email-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

/**
 * POST /api/spaces/invite
 * Create a space invitation and send email
 * Updated with permission fixes
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse request body
    const body = await req.json();
    const { space_id, email, role } = body;

    // SECURITY: Input validation
    if (!space_id || !email || typeof space_id !== 'string' || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Space ID and email are required' },
        { status: 400 }
      );
    }

    // Validate role parameter
    const validRoles = ['member', 'admin'] as const;
    const inviteRole = role && validRoles.includes(role) ? role : 'member';

    // SECURITY: Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // SECURITY: UUID validation for space_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(space_id)) {
      return NextResponse.json(
        { error: 'Invalid Space ID format' },
        { status: 400 }
      );
    }

    // SECURITY: Verify user is member of space before creating invitation
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users to this space' },
        { status: 403 }
      );
    }

    // Create invitation using service
    const result = await createInvitation(
      space_id,
      email.toLowerCase().trim(),
      session.user.id,
      inviteRole
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get space name and inviter name for email
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('name')
      .eq('id', space_id)
      .single();

    // Try to get inviter name, but handle permission errors gracefully
    let inviterData = null;
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      // If we can't access user table due to RLS, use fallback
      logger.info('Could not fetch inviter name due to permissions, using fallback', { component: 'api-route' });
    } else {
      inviterData = userData;
    }

    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${result.data.token}`;

    // Format expiration date for email
    const expiresAt = new Date(result.data.expires_at);
    const expirationText = `${Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`;

    // Send invitation email
    const emailResult = await sendSpaceInvitationEmail({
      recipientEmail: email.toLowerCase().trim(),
      inviterName: inviterData?.name || 'Someone',
      spaceName: spaceData?.name || 'a workspace',
      invitationUrl,
      expiresAt: expirationText,
    });

    // Log email result but don't fail the invitation if email fails
    if (!emailResult.success) {
      logger.error('Failed to send invitation email:', undefined, { component: 'api-route', action: 'api_request', details: emailResult.error });
      // Log to Sentry for monitoring
      Sentry.captureException(new Error(`Invitation email failed: ${emailResult.error}`), {
        tags: {
          feature: 'space-invitation',
          email_error: true,
        },
        extra: {
          recipientEmail: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask for privacy
          spaceId: space_id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        invitation_url: invitationUrl, // Include URL in response for testing
        email_sent: emailResult.success,
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/spaces/invite',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/spaces/invite error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
