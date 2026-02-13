import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { choresService } from '@/lib/services/chores-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { createChoreSchema } from '@/lib/validations/chore-schemas';
import { ZodError } from 'zod';
import { extractIP, fallbackRateLimit } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { withUserDataCache } from '@/lib/utils/cache-headers';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

// Types for query options
interface ChoreQueryOptions {
  status?: string;
  frequency?: string;
  assigned_to?: string;
  search?: string;
}

/**
 * GET /api/chores
 * Get all chores for a space with optional filtering
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

    // Verify subscription tier for household management
    const tierCheck = await canAccessFeature(user.id, 'canUseHousehold', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUseHousehold', tierCheck.tier ?? 'free');
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
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const status = searchParams.get('status');
    const frequency = searchParams.get('frequency');
    const assigned_to = searchParams.get('assigned_to');
    const search = searchParams.get('search');

    // Build query options
    const options: ChoreQueryOptions = {};
    if (status) options.status = status;
    if (frequency) options.frequency = frequency;
    if (assigned_to) options.assigned_to = assigned_to;
    if (search) options.search = search;

    // Get chores from service
    const chores = await choresService.getChores(spaceId, options, supabase);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: chores,
      })
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/chores',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/chores GET error', error, {
      component: 'ChoresAPI',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chores
 * Create a new chore
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with fallback protection
    const ip = extractIP(req.headers);

    try {
      const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch {
      // Fallback to in-memory rate limiting
      Sentry.captureMessage('Rate limiting degraded (using fallback)', {
        level: 'warning',
        tags: { service: 'rate-limit', endpoint: '/api/chores', method: 'POST' },
      });

      const allowed = fallbackRateLimit(ip, 10, 10 * 1000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
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

    // Verify subscription tier for household management
    const tierCheck = await canAccessFeature(user.id, 'canUseHousehold', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUseHousehold', tierCheck.tier ?? 'free');
    }

    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body with Zod
    const body = await req.json();

    let validatedData;
    try {
      validatedData = createChoreSchema.parse({
        ...body,
        created_by: user.id,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, validatedData.space_id);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create chore using service (transform null to undefined for nullable fields)
    const chore = await choresService.createChore({
      ...validatedData,
      description: validatedData.description ?? undefined,
      assigned_to: validatedData.assigned_to ?? undefined,
      due_date: validatedData.due_date ?? undefined,
      notes: validatedData.notes ?? undefined,
      sort_order: validatedData.sort_order ?? undefined,
    }, supabase);

    return NextResponse.json({
      success: true,
      data: chore,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/chores',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/chores POST error', error, {
      component: 'ChoresAPI',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to create chore' },
      { status: 500 }
    );
  }
}
