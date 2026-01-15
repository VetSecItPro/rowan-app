import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mealsService } from '@/lib/services/meals-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for meal updates
const UpdateMealSchema = z.object({
  recipe_id: z.string().uuid().optional(),
  name: z.string().max(200).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  scheduled_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
  assigned_to: z.string().uuid().optional(),
}).strict();

/**
 * GET /api/meals/[id]
 * Get a single meal by ID
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Get meal
    const meal = await mealsService.getMealById(params.id);

    if (!meal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to meal's space
    try {
      await verifyResourceAccess(user.id, meal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/meals/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this meal' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: meal,
    });
  } catch (error) {
    logger.error('[API] /api/meals/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meals/[id]
 * Update a meal
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Get existing meal first
    const existingMeal = await mealsService.getMealById(params.id);

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to meal's space
    try {
      await verifyResourceAccess(user.id, existingMeal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/meals/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this meal' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateMealSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Update meal using service
    const updatedMeal = await mealsService.updateMeal(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedMeal,
    });
  } catch (error) {
    logger.error('[API] /api/meals/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meals/[id]
 * Delete a meal
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Get existing meal first
    const existingMeal = await mealsService.getMealById(params.id);

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to meal's space
    try {
      await verifyResourceAccess(user.id, existingMeal);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/meals/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this meal' },
        { status: 403 }
      );
    }

    // Delete meal using service
    await mealsService.deleteMeal(params.id);

    return NextResponse.json({
      success: true,
      message: 'Meal deleted successfully',
    });
  } catch (error) {
    logger.error('[API] /api/meals/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
