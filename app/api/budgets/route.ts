import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createBudgetSchema } from '@/lib/validations/budget-schemas';

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
    const budget = await projectsService.getBudget(spaceId, supabase);

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
    logger.error('[API] /api/budgets GET error:', error, { component: 'api-route', action: 'api_request' });
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
      createBudgetSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    const { space_id, monthly_budget } = body;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
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
      { space_id, monthly_budget: Number(monthly_budget) },
      user.id,
      supabase
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
    logger.error('[API] /api/budgets POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to set budget' },
      { status: 500 }
    );
  }
}
