import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratelimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';

/**
 * GET /api/shopping/share/[token]
 * Get a public shopping list by share token
 * No authentication required
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
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

    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Find shopping list by share token
    // Must be public to be accessible
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (listError || !shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found or not public' },
        { status: 404 }
      );
    }

    // Get shopping items for this list
    const { data: items, error: itemsError } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', shoppingList.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    // Get creator name (if available)
    let creatorName = 'Someone';
    if (shoppingList.created_by) {
      const { data: creator } = await supabase
        .from('users')
        .select('name')
        .eq('id', shoppingList.created_by)
        .single();

      if (creator) {
        creatorName = creator.name;
      }
    }

    // Group items by category
    const itemsByCategory: Record<string, any[]> = {};
    items?.forEach((item) => {
      const category = item.category || 'Other';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    return NextResponse.json({
      success: true,
      data: {
        list: {
          ...shoppingList,
          creatorName,
        },
        items: items || [],
        itemsByCategory,
        stats: {
          totalItems: items?.length || 0,
          purchasedItems: items?.filter((i) => i.is_purchased).length || 0,
          categories: Object.keys(itemsByCategory).length,
        },
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/share/[token]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/shopping/share/[token] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load shopping list' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shopping/share/[token]
 * Update item purchased status (public access)
 * Allows anyone with the share token to check off items
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
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

    const { token } = params;
    const body = await req.json();
    const { itemId, isPurchased } = body;

    if (!itemId || typeof isPurchased !== 'boolean') {
      return NextResponse.json(
        { error: 'itemId and isPurchased are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify the list is public and get list ID
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (listError || !shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found or not public' },
        { status: 404 }
      );
    }

    // Update item
    const { error: updateError } = await supabase
      .from('shopping_items')
      .update({
        is_purchased: isPurchased,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('list_id', shoppingList.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/share/[token]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/shopping/share/[token] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
