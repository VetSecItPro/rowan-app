/**
 * User Feedback API Route
 * POST /api/feedback — Submit feedback (auth required, rate limited)
 * GET  /api/feedback — Get user's own feedback history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { submitFeedback, getUserFeedback } from '@/lib/services/feedback-service';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SubmitFeedbackSchema = z.object({
  category: z.enum(['bug_report', 'feature_request', 'general']),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be at most 2000 characters'),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await req.json();
    const validated = SubmitFeedbackSchema.parse(body);

    // Submit
    const result = await submitFeedback({
      userId: user.id,
      category: validated.category,
      title: validated.title,
      description: validated.description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error, {
      tags: { endpoint: '/api/feedback', method: 'POST' },
    });
    logger.error('[API] /api/feedback POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await getUserFeedback(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/feedback', method: 'GET' },
    });
    logger.error('[API] /api/feedback GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
