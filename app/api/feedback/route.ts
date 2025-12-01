import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';
import { FeedbackType } from '@/lib/types';

export async function GET(request: NextRequest) {
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

    // Get user's own feedback
    const result = await feedbackService.getUserFeedback(user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();

    const feedbackTypeRaw = formData.get('feedback_type') as string | null;
    const featureName = formData.get('feature_name') as string | null;
    const pageUrl = formData.get('page_url') as string | null;
    const description = formData.get('description') as string;
    const spaceId = formData.get('space_id') as string | null;
    const screenshot = formData.get('screenshot') as File | null;
    const browserInfoRaw = formData.get('browser_info') as string | null;

    // Validate required fields
    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Parse browser info
    let browserInfo: Record<string, any> | undefined;
    if (browserInfoRaw) {
      try {
        browserInfo = JSON.parse(browserInfoRaw);
      } catch (e) {
        console.error('Failed to parse browser info:', e);
      }
    }

    // Convert feedback type
    let feedbackType: FeedbackType | undefined;
    if (feedbackTypeRaw && Object.values(FeedbackType).includes(feedbackTypeRaw as FeedbackType)) {
      feedbackType = feedbackTypeRaw as FeedbackType;
    }

    // Submit feedback using service
    const result = await feedbackService.submitFeedback({
      user_id: user.id,
      space_id: spaceId || undefined,
      feedback_type: feedbackType,
      feature_name: featureName || undefined,
      page_url: pageUrl || undefined,
      description: description.trim(),
      screenshot: screenshot || undefined,
      browser_info: browserInfo,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
