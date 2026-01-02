import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { goalsService } from '@/lib/services/goals-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createGoalSchema } from '@/lib/validations/goal-schemas';
import { sanitizePlainText } from '@/lib/sanitize';
import { withUserDataCache } from '@/lib/utils/cache-headers';

/**
 * GET /api/goals
 * Get all goals for a space
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }


    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/goals',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get goals from service
    const goals = await goalsService.getGoals(spaceId);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: goals,
      })
    );
  } catch (error) {
    logger.error('[API] /api/goals GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body with Zod
    const body = await req.json();
    try {
      // Validate input structure and types
      createGoalSchema.parse({
        ...body,
        created_by: user.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    const { space_id, title, description } = body;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/goals',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create goal using service with sanitized inputs
    const goal = await goalsService.createGoal({
      ...body,
      title: sanitizePlainText(title),
      description: description ? sanitizePlainText(description) : undefined,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error('[API] /api/goals POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
