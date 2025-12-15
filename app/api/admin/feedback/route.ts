import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';
import { isAdmin } from '@/lib/utils/admin-check';
import { FeedbackStatus, FeedbackType } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as FeedbackStatus | null;
    const feedback_type = searchParams.get('feedback_type') as FeedbackType | null;
    const search = searchParams.get('search');

    const filters: {
      status?: FeedbackStatus;
      feedback_type?: string;
      search?: string;
    } = {};

    if (status) filters.status = status;
    if (feedback_type) filters.feedback_type = feedback_type;
    if (search) filters.search = search;

    // Fetch feedback
    const result = await feedbackService.getAllFeedback(filters);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    logger.error('Error in admin feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
