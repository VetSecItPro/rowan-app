import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
  generateShoppingList,
  categorizeIngredient,
} from '@/lib/services/ingredient-parser';
import { sendShoppingListEmail } from '@/lib/services/email-service';

/**
 * Request schema for generating shopping list
 */
const GenerateShoppingListSchema = z.object({
  mealIds: z.array(z.string().uuid()).min(1, 'At least one meal is required'),
  listName: z.string().min(1).max(200).optional(),
  spaceId: z.string().uuid(),
});

type MealRecipe = {
  id: string;
  name: string;
  ingredients: unknown;
};

type MealWithRecipe = {
  recipes?: MealRecipe | null;
};

/**
 * POST /api/shopping/generate-from-meals
 * Generate a shopping list from selected meal plans
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body
    const body = await req.json();
    const validation = GenerateShoppingListSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { mealIds, listName, spaceId } = validation.data;

    // Verify user has access to this space
    const { data: spaceMembership } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (!spaceMembership) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Fetch meals with their recipes
    const { data: meals, error: mealsError } = await supabase
      .from('meal_plans')
      .select('*, recipes(*)')
      .in('id', mealIds)
      .eq('space_id', spaceId);

    if (mealsError) {
      throw mealsError;
    }

    if (!meals || meals.length === 0) {
      return NextResponse.json(
        { error: 'No meals found with the provided IDs' },
        { status: 404 }
      );
    }

    // Extract recipes from meals
    const recipes = (meals as MealWithRecipe[])
      .filter((meal): meal is MealWithRecipe & { recipes: MealRecipe } => Boolean(meal.recipes))
      .map((meal) => ({
        id: meal.recipes.id,
        name: meal.recipes.name,
        ingredients: meal.recipes.ingredients,
      }));

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: 'No recipes found in the selected meals' },
        { status: 400 }
      );
    }

    // Generate aggregated shopping list
    const aggregatedIngredients = generateShoppingList(recipes);

    // Generate list name if not provided
    const finalListName =
      listName ||
      `Shopping List - ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;

    // Create shopping list
    const { data: shoppingList, error: createListError } = await supabase
      .from('shopping_lists')
      .insert({
        space_id: spaceId,
        name: finalListName,
        description: `Generated from ${recipes.length} recipe${recipes.length > 1 ? 's' : ''}`,
        created_by: user.id,
        meal_ids: mealIds,
        auto_generated: true,
      })
      .select()
      .single();

    if (createListError) {
      throw createListError;
    }

    // Create shopping items from aggregated ingredients
    const shoppingItems = aggregatedIngredients.map((ingredient) => ({
      list_id: shoppingList.id,
      name: ingredient.name,
      quantity: Math.round(ingredient.amount) || 1, // Ensure quantity is a whole number
      unit: ingredient.unit || null,
      category: categorizeIngredient(ingredient.name),
      notes:
        ingredient.recipes.length > 1
          ? `From: ${ingredient.recipes.map((r) => r.name).join(', ')}`
          : ingredient.recipes[0]?.name || null,
      recipe_id: ingredient.recipes[0]?.id || null,
      added_by: user.id,
      is_purchased: false,
    }));

    const { error: createItemsError } = await supabase
      .from('shopping_items')
      .insert(shoppingItems);

    if (createItemsError) {
      throw createItemsError;
    }

    // Get space name for notification
    const { data: space } = await supabase
      .from('spaces')
      .select('name')
      .eq('id', spaceId)
      .single();

    // Send email notification
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled, email_shopping_lists')
        .eq('user_id', user.id)
        .maybeSingle();

      const shouldSendEmail = !prefs || (prefs.email_enabled && prefs.email_shopping_lists);

      if (userData?.email && shouldSendEmail) {
        await sendShoppingListEmail({
          recipientEmail: userData.email,
          recipientName: userData.name || 'there',
          senderName: userData.name || userData.email.split('@')[0],
          listName: finalListName,
          listDescription: undefined,
          items: aggregatedIngredients.map((ingredient) => ({
            id: ingredient.name,
            name: ingredient.name,
            quantity: ingredient.amount ? String(Math.round(ingredient.amount)) : undefined,
            checked: false,
          })),
          totalItems: aggregatedIngredients.length,
          completedItems: 0,
          actionType: 'updated',
          spaceId,
          listId: shoppingList.id,
          spaceName: space?.name || 'Your Space',
        });
      }
    } catch (emailError) {
      // Log error but don't fail the request
      logger.error('Failed to send shopping list email', emailError instanceof Error ? emailError : new Error(String(emailError)), { component: 'api-route', action: 'email-notification', endpoint: '/api/shopping/generate-from-meals' });
      Sentry.captureException(emailError, {
        tags: {
          endpoint: '/api/shopping/generate-from-meals',
          operation: 'email-notification',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        list: shoppingList,
        itemCount: aggregatedIngredients.length,
        recipeCount: recipes.length,
      },
      message: 'Shopping list generated successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/shopping/generate-from-meals',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('/api/shopping/generate-from-meals POST error', error instanceof Error ? error : new Error(String(error)), { component: 'api-route', action: 'POST', endpoint: '/api/shopping/generate-from-meals' });
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    );
  }
}
