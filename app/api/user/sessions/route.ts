import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSessions, formatLastActive } from '@/lib/services/session-tracking-service';

/**
 * GET /api/user/sessions
 * Fetch all active sessions for the authenticated user
 */
export async function GET(request: Request) {
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

    // Get user sessions
    const result = await getUserSessions(user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Format sessions for display
    const formattedSessions = result.sessions?.map((session) => ({
      id: session.id,
      device: session.device_name || `${session.os} - ${session.browser}`,
      location: session.city && session.region
        ? `${session.city}, ${session.region}`
        : session.country || 'Unknown',
      lastActive: formatLastActive(session.last_active),
      isCurrent: session.is_current,
      createdAt: session.created_at,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ip_address,
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions || [],
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
