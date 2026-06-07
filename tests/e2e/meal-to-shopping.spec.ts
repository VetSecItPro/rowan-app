/**
 * E2E Integration Test: Meal Planning → Shopping List Generation
 *
 * Covers the full "Generate Shopping List from planned meals" flow that the
 * soft meals.spec.ts never asserts:
 *   1. A recipe (with ingredients) exists in the `recipes` table.
 *   2. That recipe is planned onto a date/slot in the `meals` table.
 *   3. POST /api/shopping/generate-from-meals aggregates the recipe's
 *      ingredients into a new shopping list + items.
 *
 * This spec is the regression guard for the meals/meal_plans table mismatch:
 * the endpoint used to read the vestigial empty `meal_plans` table, so it
 * always 404'd ("No meals found"). A hard assertion on itemCount + the
 * persisted shopping_items is what catches that class of orphan-table bug —
 * the smoke specs can't, because they never check the generate result.
 *
 * Seeding/cleanup uses the service-role admin client (same pattern as
 * concurrent-auth.spec.ts + seed-test-users.ts). The generate call itself
 * goes through the real authenticated HTTP path with a fresh CSRF token,
 * exactly as the GenerateListModal does in the browser.
 */

import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// The ingredients we seed onto the recipe. Objects keep their `name` verbatim
// through the parser (parseIngredient only re-parses string inputs), so these
// names should appear 1:1 as shopping_items.name after generation.
const SEED_INGREDIENTS = [
  { name: 'E2E Flour', amount: 2, unit: 'cup' },
  { name: 'E2E Eggs', amount: 3, unit: '' },
  { name: 'E2E Salt', amount: 1, unit: 'tsp' },
];

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Meal → Shopping List integration', () => {
  // Service-role key is required to seed a recipe (no public create-recipe API)
  // and a planned meal deterministically. Locally it lives in .env.local; in CI
  // it's a repo secret. Skip cleanly when absent rather than fail spuriously.
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
  );

  let admin: SupabaseClient;
  let spaceId: string;
  let userId: string;
  // Track seeded rows for guaranteed cleanup even if an assertion throws.
  const created = { recipeId: '', mealId: '', listId: '' };

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.pro.email)
      .single();
    expect(userErr, `lookup test-pro user: ${userErr?.message}`).toBeNull();
    userId = userRow!.id;

    const { data: memberRow, error: memberErr } = await admin
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    expect(memberErr, `lookup test-pro space: ${memberErr?.message}`).toBeNull();
    spaceId = memberRow!.space_id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    // Order matters: items reference the list; meal/recipe are independent.
    if (created.listId) {
      await admin.from('shopping_items').delete().eq('list_id', created.listId);
      await admin.from('shopping_lists').delete().eq('id', created.listId);
    }
    if (created.mealId) await admin.from('meals').delete().eq('id', created.mealId);
    if (created.recipeId) await admin.from('recipes').delete().eq('id', created.recipeId);
  });

  test('generates a shopping list from a planned meal with recipe ingredients', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // ── Seed: recipe with ingredients ──────────────────────────────────────
    const { data: recipe, error: recipeErr } = await admin
      .from('recipes')
      .insert({
        space_id: spaceId,
        name: `E2E Integration Recipe ${Date.now()}`,
        ingredients: SEED_INGREDIENTS,
        created_by: userId,
      })
      .select('id')
      .single();
    expect(recipeErr, `seed recipe: ${recipeErr?.message}`).toBeNull();
    created.recipeId = recipe!.id;

    // ── Seed: plan that recipe onto today's dinner slot (the `meals` table) ──
    const today = new Date().toISOString().split('T')[0];
    const { data: meal, error: mealErr } = await admin
      .from('meals')
      .insert({
        space_id: spaceId,
        recipe_id: created.recipeId,
        meal_type: 'dinner',
        scheduled_date: today,
        name: 'E2E Integration Dinner',
        created_by: userId,
      })
      .select('id')
      .single();
    expect(mealErr, `seed meal: ${mealErr?.message}`).toBeNull();
    created.mealId = meal!.id;

    // ── Authenticate as the plus-tier user (cookies into page context) ──────
    await ensureAuthenticated(page, 'pro');

    // ── Drive the real generate endpoint with a fresh CSRF token ────────────
    // Mirrors lib/utils/csrf-fetch.ts: GET token, then send as x-csrf-token.
    const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
    expect(tokenResp.ok(), 'fetch csrf token').toBeTruthy();
    const { token: csrfToken } = (await tokenResp.json()) as { token?: string };
    expect(csrfToken, 'csrf token present').toBeTruthy();

    const genResp = await page.request.post('/api/shopping/generate-from-meals', {
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken! },
      data: {
        mealIds: [created.mealId],
        listName: 'E2E Integration Groceries',
        spaceId,
      },
      timeout: 20000,
    });

    // The orphan-table bug surfaced here as 404 "No meals found". Assert hard.
    const genBody = await genResp.json();
    expect(
      genResp.ok(),
      `generate-from-meals failed (${genResp.status()}): ${JSON.stringify(genBody)}`
    ).toBeTruthy();
    expect(genBody.success).toBe(true);
    expect(genBody.data.recipeCount).toBe(1);
    expect(genBody.data.itemCount).toBe(SEED_INGREDIENTS.length);

    const listId = genBody.data.list.id as string;
    created.listId = listId;
    expect(listId).toBeTruthy();

    // ── Verify persistence: shopping_items carry the recipe's ingredients ───
    const { data: items, error: itemsErr } = await admin
      .from('shopping_items')
      .select('name, recipe_id')
      .eq('list_id', listId);
    expect(itemsErr, `read shopping_items: ${itemsErr?.message}`).toBeNull();
    expect(items!.length).toBe(SEED_INGREDIENTS.length);

    const itemNames = items!.map((i) => i.name.toLowerCase());
    for (const ing of SEED_INGREDIENTS) {
      expect(
        itemNames.some((n) => n.includes(ing.name.toLowerCase())),
        `shopping list should contain "${ing.name}" (got: ${itemNames.join(', ')})`
      ).toBeTruthy();
    }

    // Every generated item should be linked back to the source recipe.
    expect(items!.every((i) => i.recipe_id === created.recipeId)).toBe(true);
  });

  test('rejects generation when no real meals match the provided IDs', async ({
    page,
  }) => {
    // A random UUID that isn't a planned meal must 404 — proves the endpoint
    // actually scopes to existing rows (and isn't silently succeeding).
    await ensureAuthenticated(page, 'pro');

    const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
    const { token: csrfToken } = (await tokenResp.json()) as { token?: string };

    const resp = await page.request.post('/api/shopping/generate-from-meals', {
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken! },
      data: {
        mealIds: ['00000000-0000-0000-0000-000000000000'],
        spaceId,
      },
      timeout: 20000,
    });

    expect(resp.status()).toBe(404);
  });
});
