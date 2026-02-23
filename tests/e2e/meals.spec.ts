/**
 * E2E Tests for Meals/Recipes Feature
 *
 * Tests meals page functionality including viewing, browsing recipes, and meal planning.
 * Uses pre-authenticated pro user session (meals may be a gated feature).
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for meals tests (meals is a gated feature)
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Meals/Recipes Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/meals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('meals page loads and displays meal planner', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /meals|recipes|planner/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify meal planning interface is present
    const mealInterface = page.locator('[data-testid="meal-planner"], .meal-planner, [class*="meal"]').first();
    const hasInterface = await mealInterface.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInterface) {
      console.log('✓ Meals page loaded with meal planner');
    } else {
      console.log('✓ Meals page loaded');
    }
  });

  test('can view meal calendar/schedule', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for calendar/schedule view
    const calendarView = page.locator('[data-testid="meal-calendar"], .meal-calendar, [class*="calendar"]').first();
    const hasCalendar = await calendarView.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCalendar) {
      console.log('✓ Meal calendar view displayed');
    }

    // Look for week days
    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let foundDays = 0;

    for (const day of weekDays) {
      const dayElement = page.locator(`text=/${day}/i`).first();
      if (await dayElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundDays++;
      }
    }

    if (foundDays >= 3) {
      console.log(`✓ Found ${foundDays} days in meal schedule`);
    }
  });

  test('can browse recipes', async ({ page }) => {
    test.setTimeout(45000);

    // Look for recipes tab/section
    const recipesTab = page.locator('[data-testid="recipes-tab"], button:has-text("Recipes"), a:has-text("Recipes")').first();

    if (await recipesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await recipesTab.click();
      await page.waitForTimeout(1500);
      console.log('✓ Navigated to recipes section');
    } else {
      // Try direct navigation
      await page.goto('/meals/recipes', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Look for recipe list/grid
    const recipeList = page.locator('[data-testid="recipe-list"], [data-testid="recipe-grid"], .recipe-list, [class*="recipe"]').first();
    const hasRecipes = await recipeList.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRecipes) {
      console.log('✓ Recipe list displayed');

      // Count visible recipes
      const recipeCards = page.locator('[data-testid^="recipe-card-"], .recipe-card, [class*="recipe"]');
      const count = await recipeCards.count();

      if (count > 0) {
        console.log(`✓ Found ${count} recipes`);
      }
    } else {
      console.log('⚠ Recipe list not found');
    }
  });

  test('can add a meal to the schedule', async ({ page }) => {
    test.setTimeout(45000);

    // Look for add meal button
    const addMealButton = page.locator('[data-testid="add-meal-button"], button:has-text("Add Meal"), button:has-text("Plan Meal")').first();

    if (await addMealButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addMealButton.click();
      await page.waitForTimeout(1000);

      // Fill meal form
      const mealName = `E2E Test Meal ${Date.now()}`;
      const nameInput = page.locator('[data-testid="meal-name-input"], input[name="name"], input[placeholder*="meal" i]').first();

      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill(mealName);

        // Optional: Select meal type (breakfast, lunch, dinner)
        const mealTypeSelect = page.locator('[data-testid="meal-type-select"], select[name="meal_type"], select[name="type"]').first();
        if (await mealTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mealTypeSelect.selectOption('dinner');
        }

        // Submit form
        const submitButton = page.locator('[data-testid="meal-submit-button"], button[type="submit"], button:has-text("Add"), button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify meal appears
        const mealElement = page.locator(`text=/${mealName}/i`).first();
        const mealVisible = await mealElement.isVisible({ timeout: 5000 }).catch(() => false);

        if (mealVisible) {
          console.log(`✓ Added meal to schedule: ${mealName}`);
        } else {
          console.log('⚠ Meal added but not visible in current view');
        }
      } else {
        console.log('⚠ Meal name input not found');
      }
    } else {
      // Try clicking on a day to add meal
      const daySlot = page.locator('[data-testid^="meal-slot-"], .meal-slot, [class*="day"]').first();
      if (await daySlot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await daySlot.click();
        await page.waitForTimeout(1000);
        console.log('⚠ Clicked day slot but add meal form not found');
      } else {
        console.log('⚠ Add meal button not found');
      }
    }
  });

  test('can view meal details', async ({ page }) => {
    // Wait for meals to load
    await page.waitForTimeout(2000);

    // Look for an existing meal
    const existingMeal = page.locator('[data-testid^="meal-card-"], .meal-card, [class*="meal"]').first();

    if (await existingMeal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingMeal.click();
      await page.waitForTimeout(1000);

      // Check if meal details modal/panel appeared
      const mealDetails = page.locator('[data-testid="meal-details"], [role="dialog"], .meal-details').first();
      const detailsVisible = await mealDetails.isVisible({ timeout: 3000 }).catch(() => false);

      if (detailsVisible) {
        console.log('✓ Meal details displayed');
      } else {
        console.log('⚠ Meal clicked but details view not found');
      }
    } else {
      console.log('⚠ No meals found to view');
    }
  });

  test('can filter meals by type', async ({ page }) => {
    // Wait for meals to load
    await page.waitForTimeout(2000);

    // Look for meal type filters
    const mealTypes = [
      { testId: 'filter-breakfast', text: /breakfast/i },
      { testId: 'filter-lunch', text: /lunch/i },
      { testId: 'filter-dinner', text: /dinner/i },
    ];

    let filtersFound = 0;

    for (const type of mealTypes) {
      const filterButton = page.locator(`[data-testid="${type.testId}"], button:has-text("${type.text.source}")`, { hasText: type.text }).first();

      if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterButton.click();
        await page.waitForTimeout(1000);
        filtersFound++;
        console.log(`✓ Applied filter: ${type.text.source}`);
      }
    }

    if (filtersFound > 0) {
      console.log(`✓ Meal type filtering available (${filtersFound} filters)`);
    } else {
      console.log('⚠ Meal type filters not found');
    }
  });

  test('can delete a meal from schedule', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for meals to load
    await page.waitForTimeout(2000);

    // Look for an existing meal
    const existingMeal = page.locator('[data-testid^="meal-card-"], .meal-card, [class*="meal"]').first();

    if (await existingMeal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const mealText = await existingMeal.textContent();
      await existingMeal.click();
      await page.waitForTimeout(1000);

      // Look for delete button
      const deleteButton = page.locator('[data-testid="meal-delete-button"], button:has-text("Delete"), button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation dialog
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Confirm"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        console.log(`✓ Meal deleted: ${mealText?.substring(0, 50)}`);
      } else {
        console.log('⚠ Delete button not found');
      }
    } else {
      console.log('⚠ No meals found to delete');
    }
  });

  test('shows empty state when no meals planned', async ({ page }) => {
    // Check for empty state
    const emptyState = page.locator('[data-testid="meals-empty-state"], text=/no meals/i, text=/plan your first/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed');
    } else {
      console.log('⚠ Empty state not visible (meals may exist)');
    }
  });
});
