import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { feedbackService } from '@/lib/services/feedback-service';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';
import { FeedbackType } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for feedback submission
const feedbackSchema = z.object({
  feedback_type: z.nativeEnum(FeedbackType).optional(),
  feature_name: z.string().max(200).optional(),
  page_url: z.string().url().max(2000).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  space_id: z.string().uuid().optional(),
  browser_info: z.string().max(5000).optional(),
});

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
    logger.error('Error in feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
    const screenshot = formData.get('screenshot') as File | null;

    // Validate with Zod schema
    const rawData = {
      feedback_type: formData.get('feedback_type') as string | undefined || undefined,
      feature_name: formData.get('feature_name') as string | undefined || undefined,
      page_url: formData.get('page_url') as string | undefined || undefined,
      description: formData.get('description') as string,
      space_id: formData.get('space_id') as string | undefined || undefined,
      browser_info: formData.get('browser_info') as string | undefined || undefined,
    };

    const parsed = feedbackSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const validated = parsed.data;

    // SECURITY: Parse browser info with Zod validation to prevent malformed JSON
    let browserInfo: Record<string, unknown> | undefined;
    if (validated.browser_info) {
      try {
        const rawParsed = JSON.parse(validated.browser_info);
        const BrowserInfoSchema = z.record(z.string(), z.unknown());
        const parseResult = BrowserInfoSchema.safeParse(rawParsed);
        browserInfo = parseResult.success ? parseResult.data : undefined;
        if (!parseResult.success) {
          logger.warn('Browser info failed Zod validation', { component: 'api-route', action: 'validation_failed' });
        }
      } catch (e) {
        logger.warn('Failed to parse browser info:', { component: 'api-route', action: 'parse_failed', error: e });
      }
    }

    // Sanitize user input to prevent XSS attacks
    const sanitizedDescription = sanitizePlainText(validated.description);
    const sanitizedFeatureName = validated.feature_name ? sanitizePlainText(validated.feature_name) : undefined;
    const sanitizedPageUrl = validated.page_url ? sanitizeUrl(validated.page_url) : undefined;

    // Submit feedback using service
    const result = await feedbackService.submitFeedback({
      user_id: user.id,
      space_id: validated.space_id,
      feedback_type: validated.feedback_type,
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
    logger.error('Error in feedback API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
