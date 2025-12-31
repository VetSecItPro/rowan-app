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
import { z } from 'zod';
import { spaceInviteSchema, validateAndSanitizeInvite } from '@/lib/validations/space-schemas';

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
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse and validate request body with Zod
    const body = await req.json();
    let validatedData;
    try {
      validatedData = validateAndSanitizeInvite(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    // SECURITY: Verify user is member of space before creating invitation
    try {
      await verifySpaceAccess(session.user.id, validatedData.space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users to this space' },
        { status: 403 }
      );
    }

    // Create invitation using service
    const result = await createInvitation(
      validatedData.space_id,
      validatedData.email,
      session.user.id,
      validatedData.role
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get space name and inviter name in parallel for speed
    const [spaceResult, userResult] = await Promise.all([
      supabase.from('spaces').select('name').eq('id', validatedData.space_id).single(),
      supabase.from('users').select('name').eq('id', session.user.id).single(),
    ]);

    const spaceData = spaceResult.data;
    const inviterData = userResult.error ? null : userResult.data;

    if (userResult.error) {
      logger.info('Could not fetch inviter name due to permissions, using fallback', { component: 'api-route' });
    }

    // Invitation URL - the token itself serves as signup authorization for invited users
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${result.data.token}`;

    // Format expiration date for email
    const expiresAt = new Date(result.data.expires_at);
    const expirationText = `${Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`;

    // Send invitation email with retry mechanism
    // Await the result to ensure email is sent before responding
    const emailResult = await sendSpaceInvitationEmail({
      recipientEmail: validatedData.email,
      inviterName: inviterData?.name || 'Someone',
      spaceName: spaceData?.name || 'a workspace',
      invitationUrl,
      expiresAt: expirationText,
    });

    if (!emailResult.success) {
      logger.error('Failed to send invitation email:', undefined, {
        component: 'api-route',
        action: 'api_request',
        details: emailResult.error
      });
      Sentry.captureException(new Error(`Invitation email failed: ${emailResult.error}`), {
        tags: { feature: 'space-invitation', email_error: true },
        extra: {
          recipientEmail: validatedData.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          spaceId: validatedData.space_id,
          timestamp: new Date().toISOString(),
        },
      });

      // Still return success for invitation creation, but indicate email status
      return NextResponse.json({
        success: true,
        data: {
          ...result.data,
          invitation_url: invitationUrl,
          email_sent: false,
          email_error: 'Failed to send email. You can share the invitation link directly.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        invitation_url: invitationUrl,
        email_sent: true,
        message_id: emailResult.messageId,
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
