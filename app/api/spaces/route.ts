import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSpaces } from '@/lib/services/spaces-service';

/**
 * GET /api/spaces
 * Get all spaces the authenticated user belongs to
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getUserSpaces(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API] /api/spaces error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
