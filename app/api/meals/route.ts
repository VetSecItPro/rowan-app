import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mealsService } from '@/lib/services/meals-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/meals
 * Get all meals for a space
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
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
      await verifySpaceAccess(session.user.id, spaceId);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get meals from service
    const meals = await mealsService.getMeals(spaceId);

    return NextResponse.json({
      success: true,
      data: meals,
    });
  } catch (error) {
    console.error('[API] /api/meals GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meals
 * Create a new meal
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
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

    // Parse request body
    const body = await req.json();
    const { space_id, meal_type, scheduled_date } = body;

    // Validate required fields
    if (!space_id || !meal_type || !scheduled_date) {
      return NextResponse.json(
        { error: 'space_id, meal_type, and scheduled_date are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create meal using service
    const meal = await mealsService.createMeal(body);

    return NextResponse.json({
      success: true,
      data: meal,
    });
  } catch (error) {
    console.error('[API] /api/meals POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
}
