import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';
import { isAdmin } from '@/lib/utils/admin-check';
import { UpdateFeedbackInput } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin access
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const update: UpdateFeedbackInput = {};
    if (body.status) update.status = body.status;
    if (body.admin_notes !== undefined) update.admin_notes = body.admin_notes;

    // Update feedback
    const result = await feedbackService.updateFeedback(id, update);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error in admin feedback update API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin access
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete feedback
    const result = await feedbackService.deleteFeedback(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in admin feedback delete API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
