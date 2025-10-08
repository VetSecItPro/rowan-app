import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { ratelimit } from '@/lib/ratelimit';

/**
 * GET /api/budgets
 * Get budget for a space
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
      console.warn('[API] Rate limiting failed, continuing without rate limit:', rateLimitError);
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

    // Get budget from service
    const budget = await projectsService.getBudget(spaceId);

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('[API] /api/budgets GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budgets
 * Create or update budget for a space
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
      console.warn('[API] Rate limiting failed, continuing without rate limit:', rateLimitError);
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
    const { space_id, monthly_budget } = body;

    // Validate required fields
    if (!space_id || monthly_budget === undefined || monthly_budget === null) {
      return NextResponse.json(
        { error: 'space_id and monthly_budget are required' },
        { status: 400 }
      );
    }

    // Validate monthly_budget is a number
    const budgetAmount = Number(monthly_budget);
    if (isNaN(budgetAmount) || budgetAmount < 0) {
      return NextResponse.json(
        { error: 'monthly_budget must be a positive number' },
        { status: 400 }
      );
    }

    // Create/update budget using service
    const budget = await projectsService.setBudget(
      { space_id, monthly_budget: budgetAmount },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error('[API] /api/budgets POST error:', error);
    return NextResponse.json(
      { error: 'Failed to set budget' },
      { status: 500 }
    );
  }
}
