import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInvitation } from '@/lib/services/invitations-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';

/**
 * POST /api/spaces/invite
 * Create a space invitation and send email
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: rateLimitSuccess } = await ratelimit.limit(ip);

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
    const { space_id, email } = body;

    // SECURITY: Input validation
    if (!space_id || !email || typeof space_id !== 'string' || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Space ID and email are required' },
        { status: 400 }
      );
    }

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
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // TODO: Send invitation email using Resend
    // This will be implemented when email integration is ready
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${result.data.token}`;

    // SECURITY: Do not log sensitive tokens
    // For now, just return the invitation data
    // Later, we'll integrate Resend to send the email

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        invitation_url: invitationUrl, // Include URL in response for testing
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
    console.error('[API] /api/spaces/invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
