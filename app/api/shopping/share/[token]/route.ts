import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkShoppingTokenRateLimit } from '@/lib/ratelimit-shopping';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Zod schemas for validation
const ShareTokenSchema = z.string()
  .min(32, 'Share token must be at least 32 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Share token contains invalid characters');

const PatchItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID format'),
  isPurchased: z.boolean({ message: 'isPurchased must be a boolean' }),
});

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
    // Specific rate limiting for shopping token access (5 attempts per IP per minute)
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkShoppingTokenRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many shopping list access attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { token } = params;

    // Validate token format with Zod
    const tokenValidation = ShareTokenSchema.safeParse(token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        { error: 'Invalid share token format', details: tokenValidation.error.issues },
        { status: 400 }
      );
    }

    const validatedToken = tokenValidation.data;
    const supabase = createClient();

    // Find shopping list by share token
    // Must be public to be accessible
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('share_token', validatedToken)
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
    items?.forEach((item: any) => {
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
          purchasedItems: items?.filter((i: any) => i.is_purchased).length || 0,
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
    logger.error('Shopping share GET error', error, { component: 'api/shopping/share', action: 'get' });
    return NextResponse.json(
      { error: 'Failed to load shopping list' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shopping/share/[token]
 * Update item purchased status (public access)
 * Allows anyone with the share token to check off items (if not read-only)
 *
 * Security: Only allows updating is_purchased field, not item details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Specific rate limiting for shopping token access (5 attempts per IP per minute)
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkShoppingTokenRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many shopping list access attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { token } = params;

    // Validate token format with Zod
    const tokenValidation = ShareTokenSchema.safeParse(token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        { error: 'Invalid share token format', details: tokenValidation.error.issues },
        { status: 400 }
      );
    }

    const validatedToken = tokenValidation.data;

    // Parse and validate request body with Zod
    const body = await req.json();
    const bodyValidation = PatchItemSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: bodyValidation.error.issues },
        { status: 400 }
      );
    }

    const { itemId, isPurchased } = bodyValidation.data;

    const supabase = createClient();

    // Verify the list is public, not read-only, and get list ID
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select('id, share_read_only')
      .eq('share_token', validatedToken)
      .eq('is_public', true)
      .single();

    if (listError || !shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found or not public' },
        { status: 404 }
      );
    }

    // Check if list is shared as read-only
    if (shoppingList.share_read_only) {
      return NextResponse.json(
        { error: 'This shopping list is shared as read-only. You cannot modify items.' },
        { status: 403 }
      );
    }

    // Security: ONLY allow updating is_purchased field
    // Prevents modification of item name, quantity, notes, etc.
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
    logger.error('Shopping share PATCH error', error, { component: 'api/shopping/share', action: 'patch' });
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
