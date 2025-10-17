import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeSession } from '@/lib/services/session-tracking-service';

/**
 * DELETE /api/user/sessions/[sessionId]
 * Revoke a specific session
 */
export async function DELETE(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.sessionId;

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Revoke the session
    const result = await revokeSession(sessionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
