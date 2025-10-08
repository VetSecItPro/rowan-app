import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInvitation } from '@/lib/services/invitations-service';
import { ratelimit } from '@/lib/ratelimit';

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

    // Parse request body
    const body = await req.json();
    const { space_id, email } = body;

    if (!space_id || !email) {
      return NextResponse.json(
        { error: 'Space ID and email are required' },
        { status: 400 }
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

    console.log('[API] Invitation created. URL:', invitationUrl);
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
    console.error('[API] /api/spaces/invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
