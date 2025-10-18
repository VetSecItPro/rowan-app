import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * GET /api/budgets
 * Get budget for a space
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
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/budgets',
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

    // Get budget from service
    const budget = await projectsService.getBudget(spaceId);

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/budgets',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
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

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/budgets',
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
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/budgets',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/budgets POST error:', error);
    return NextResponse.json(
      { error: 'Failed to set budget' },
      { status: 500 }
    );
  }
}
