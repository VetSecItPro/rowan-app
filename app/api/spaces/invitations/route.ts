import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPendingInvitations, cancelInvitation, resendInvitation } from '@/lib/services/invitations-service';
import { sendSpaceInvitationEmail } from '@/lib/services/email-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { buildAppUrl } from '@/lib/utils/app-url';
import { z } from 'zod';

// Zod schemas for invitation operations
const CancelInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
}).strict();

const ResendInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  space_id: z.string().uuid().optional(),
}).strict();

/**
 * GET /api/spaces/invitations?space_id=xxx
 * Get pending invitations for a space
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    setSentryUser(user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Get pending invitations
    const result = await getPendingInvitations(spaceId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Add invitation URLs to each invitation
    const invitationsWithUrls = result.data.map((inv: any) => ({
      ...inv,
      invitation_url: buildAppUrl('/invitations/accept', { token: inv.token }),
    }));

    return NextResponse.json({
      success: true,
      data: invitationsWithUrls,
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('[API] /api/spaces/invitations GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spaces/invitations
 * Cancel an invitation
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    setSentryUser(user);

    const body = await req.json();
    const validationResult = CancelInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { invitation_id } = validationResult.data;

    const result = await cancelInvitation(invitation_id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled',
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('[API] /api/spaces/invitations DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/spaces/invitations
 * Resend an invitation
 */
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    setSentryUser(user);

    const body = await req.json();
    const validationResult = ResendInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { invitation_id, space_id } = validationResult.data;

    // Resend invitation (creates new token)
    const result = await resendInvitation(invitation_id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get space name and inviter name for email
    const [spaceResult, userResult] = await Promise.all([
      supabase.from('spaces').select('name').eq('id', space_id || result.data.space_id).single(),
      supabase.from('users').select('name').eq('id', user.id).single(),
    ]);

    const invitationUrl = buildAppUrl('/invitations/accept', { token: result.data.token });
    const expiresAt = new Date(result.data.expires_at);
    const expirationText = `${Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`;

    // Send email with retry
    const emailResult = await sendSpaceInvitationEmail({
      recipientEmail: result.data.email,
      inviterName: userResult.data?.name || 'Someone',
      spaceName: spaceResult.data?.name || 'a workspace',
      invitationUrl,
      expiresAt: expirationText,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        invitation_url: invitationUrl,
        email_sent: emailResult.success,
        email_error: emailResult.success ? undefined : emailResult.error,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('[API] /api/spaces/invitations PUT error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
