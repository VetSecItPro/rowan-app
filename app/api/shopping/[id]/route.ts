import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shoppingService } from '@/lib/services/shopping-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/shopping/[id]
 * Get a single shopping list by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      await verifyResourceAccess(session.user.id, list);
    } catch (error) {
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
    console.error('[API] /api/shopping/[id] GET error:', error);
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
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      await verifyResourceAccess(session.user.id, existingList);
    } catch (error) {
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
    console.error('[API] /api/shopping/[id] PATCH error:', error);
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
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      await verifyResourceAccess(session.user.id, existingList);
    } catch (error) {
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
    console.error('[API] /api/shopping/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete shopping list' },
      { status: 500 }
    );
  }
}
