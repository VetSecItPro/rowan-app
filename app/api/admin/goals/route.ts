/**
 * Admin Goals API Route
 * GET /api/admin/goals - Fetch all active OKR goals
 * POST /api/admin/goals - Create a new goal
 * PUT /api/admin/goals - Update an existing goal
 * DELETE /api/admin/goals - Soft-delete a goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, invalidateCache } from '@/lib/services/admin-cache-service';
import { adminGoalsService } from '@/lib/services/admin-goals-service';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createGoalSchema = z.object({
  metric_name: z.string().min(1).max(200),
  target_value: z.number().positive(),
  current_value: z.number().default(0),
  unit: z.enum(['users', 'currency', 'percentage', 'number']),
  deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateGoalSchema = z.object({
  id: z.string().uuid(),
  metric_name: z.string().min(1).max(200).optional(),
  target_value: z.number().positive().optional(),
  current_value: z.number().optional(),
  unit: z.enum(['users', 'currency', 'percentage', 'number']).optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const deleteGoalSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Check for cache bypass
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Fetch goals (with cache)
    const goals = await withCache(
      ADMIN_CACHE_KEYS.adminGoals,
      () => adminGoalsService.getGoals(),
      { ttl: ADMIN_CACHE_TTL.adminGoals, skipCache: forceRefresh }
    );

    return NextResponse.json({ success: true, goals });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/goals', method: 'GET' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/goals GET error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Create goal
    const goal = await adminGoalsService.createGoal({
      ...validation.data,
      created_by: auth.adminId,
    });

    // Invalidate cache
    await invalidateCache(ADMIN_CACHE_KEYS.adminGoals);

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/goals', method: 'POST' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/goals POST error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = updateGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    // Update goal
    const goal = await adminGoalsService.updateGoal(id, updateData);

    // Invalidate cache
    await invalidateCache(ADMIN_CACHE_KEYS.adminGoals);

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/goals', method: 'PUT' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/goals PUT error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Admin auth
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = deleteGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Delete goal (soft delete)
    await adminGoalsService.deleteGoal(validation.data.id);

    // Invalidate cache
    await invalidateCache(ADMIN_CACHE_KEYS.adminGoals);

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/goals', method: 'DELETE' },
      extra: { timestamp: new Date().toISOString() },
    });
    logger.error('[API] /api/admin/goals DELETE error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
