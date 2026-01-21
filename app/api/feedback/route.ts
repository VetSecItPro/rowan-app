import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';
import { FeedbackType } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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

    // Get user's own feedback
    const result = await feedbackService.getUserFeedback(user.id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Error in feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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
    let browserInfo: Record<string, unknown> | undefined;
    if (browserInfoRaw) {
      try {
        browserInfo = JSON.parse(browserInfoRaw);
      } catch (e) {
        logger.error('Failed to parse browser info:', e, { component: 'api-route', action: 'api_request' });
      }
    }

    // Convert feedback type
    let feedbackType: FeedbackType | undefined;
    if (feedbackTypeRaw && Object.values(FeedbackType).includes(feedbackTypeRaw as FeedbackType)) {
      feedbackType = feedbackTypeRaw as FeedbackType;
    }

    // Sanitize user input to prevent XSS attacks
    const sanitizedDescription = sanitizePlainText(description);
    const sanitizedFeatureName = featureName ? sanitizePlainText(featureName) : undefined;
    const sanitizedPageUrl = pageUrl ? sanitizeUrl(pageUrl) : undefined;

    // Submit feedback using service
    const result = await feedbackService.submitFeedback({
      user_id: user.id,
      space_id: spaceId || undefined,
      feedback_type: feedbackType,
      feature_name: sanitizedFeatureName,
      page_url: sanitizedPageUrl,
      description: sanitizedDescription,
      screenshot: screenshot || undefined,
      browser_info: browserInfo,
    }, supabase);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Error in feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
