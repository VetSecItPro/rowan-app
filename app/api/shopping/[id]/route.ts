import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shoppingService } from '@/lib/services/shopping-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * GET /api/shopping/[id]
 * Get a single shopping list by ID
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

    // Get shopping list
    const list = await shoppingService.getListById(params.id);

    if (!list) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    // Verify user has access to list's space
    try {
      await verifyResourceAccess(user.id, list);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this shopping list' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    logger.error('[API] /api/shopping/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shopping/[id]
 * Update a shopping list
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

    // Get existing list first
    const existingList = await shoppingService.getListById(params.id);

    if (!existingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    // Verify user has access to list's space
    try {
      await verifyResourceAccess(user.id, existingList);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this shopping list' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await req.json();

    // Update list using service
    const updatedList = await shoppingService.updateList(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedList,
    });
  } catch (error) {
    logger.error('[API] /api/shopping/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update shopping list' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shopping/[id]
 * Delete a shopping list
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

    // Get existing list first
    const existingList = await shoppingService.getListById(params.id);

    if (!existingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    // Verify user has access to list's space
    try {
      await verifyResourceAccess(user.id, existingList);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this shopping list' },
        { status: 403 }
      );
    }

    // Delete list using service
    await shoppingService.deleteList(params.id);

    return NextResponse.json({
      success: true,
      message: 'Shopping list deleted successfully',
    });
  } catch (error) {
    logger.error('[API] /api/shopping/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete shopping list' },
      { status: 500 }
    );
  }
}
