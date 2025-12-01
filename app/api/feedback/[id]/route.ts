import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify user owns this feedback
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!feedback || feedback.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only delete your own feedback' },
        { status: 403 }
      );
    }

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
    console.error('Error in feedback delete API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
