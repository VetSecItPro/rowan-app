import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { goalsService } from '@/lib/services/goals-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * GET /api/goals/[id]
 * Get a single goal by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get goal
    const goal = await goalsService.getGoalById(params.id);

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Verify user has access to goal's space
    try {
      await verifyResourceAccess(session.user.id, goal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/goals/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this goal' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error('[API] /api/goals/[id] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]
 * Update a goal
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get existing goal first
    const existingGoal = await goalsService.getGoalById(params.id);

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Verify user has access to goal's space
    try {
      await verifyResourceAccess(session.user.id, existingGoal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/goals/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this goal' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await req.json();

    // Update goal using service
    const updatedGoal = await goalsService.updateGoal(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedGoal,
    });
  } catch (error) {
    console.error('[API] /api/goals/[id] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get existing goal first
    const existingGoal = await goalsService.getGoalById(params.id);

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Verify user has access to goal's space
    try {
      await verifyResourceAccess(session.user.id, existingGoal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/goals/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this goal' },
        { status: 403 }
      );
    }

    // Delete goal using service
    await goalsService.deleteGoal(params.id);

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    console.error('[API] /api/goals/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
