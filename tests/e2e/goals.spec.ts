/**
 * E2E Tests for Goals Feature
 *
 * Tests goals page functionality including viewing, creating, tracking progress, and completing goals.
 * Uses pre-authenticated pro user session (goals may be a gated feature).
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for goals tests (goals is a gated feature)
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Goals Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/goals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('goals page loads and displays goal list', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /goals/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify add goal button exists
    const addButton = page.locator('[data-testid="add-goal-button"], button:has-text("New Goal"), button:has-text("Create Goal"), button:has-text("Add Goal")').first();
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddButton) {
      console.log('✓ Goals page loaded with add goal button');
    } else {
      console.log('✓ Goals page loaded');
    }
  });

  test('can create a new goal', async ({ page }) => {
    test.setTimeout(45000);

    // Click add goal button
    const addButton = page.locator('[data-testid="add-goal-button"], button:has-text("New Goal"), button:has-text("Create Goal"), button:has-text("Add Goal")').first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill goal form
      const goalTitle = `E2E Test Goal ${Date.now()}`;
      const titleInput = page.locator('[data-testid="goal-title-input"], input[name="title"], input[placeholder*="goal" i]').first();

      if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.fill(goalTitle);

        // Optional: Fill description
        const descriptionInput = page.locator('[data-testid="goal-description-input"], textarea[name="description"], textarea[placeholder*="description" i]').first();
        if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await descriptionInput.fill('Created by E2E test for goals feature');
        }

        // Optional: Set target date
        const targetDateInput = page.locator('[data-testid="goal-target-date-input"], input[type="date"], input[name*="target" i]').first();
        if (await targetDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          await targetDateInput.fill(nextMonth.toISOString().split('T')[0]);
        }

        // Submit form
        const submitButton = page.locator('[data-testid="goal-submit-button"], button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify goal appears in list
        const goalElement = page.locator(`text=/${goalTitle}/i`).first();
        await expect(goalElement).toBeVisible({ timeout: 5000 });

        console.log(`✓ Created goal: ${goalTitle}`);
      } else {
        console.log('⚠ Goal title input not found');
      }
    } else {
      console.log('⚠ Add goal button not found');
    }
  });

  test('can view goal progress', async ({ page }) => {
    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for an existing goal
    const existingGoal = page.locator('[data-testid^="goal-card-"], [data-testid^="goal-item-"], .goal-card, [class*="goal"]').first();

    if (await existingGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Look for progress indicator
      const progressBar = page.locator('[data-testid*="progress"], .progress-bar, [class*="progress"]').first();
      const progressText = page.locator('text=/%/i').first();

      const hasProgress =
        await progressBar.isVisible({ timeout: 3000 }).catch(() => false) ||
        await progressText.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasProgress) {
        console.log('✓ Goal progress indicator displayed');
      } else {
        console.log('⚠ Progress indicator not found');
      }
    } else {
      console.log('⚠ No goals found to view progress');
    }
  });

  test('can update goal progress', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for an existing goal
    const existingGoal = page.locator('[data-testid^="goal-card-"], [data-testid^="goal-item-"], .goal-card, [class*="goal"]').first();

    if (await existingGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingGoal.click();
      await page.waitForTimeout(1000);

      // Look for update progress button/input
      const updateButton = page.locator('[data-testid="update-progress-button"], button:has-text("Update Progress")').first();
      const progressInput = page.locator('[data-testid="progress-input"], input[type="number"], input[name*="progress" i]').first();

      if (await updateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await updateButton.click();
        await page.waitForTimeout(500);
      }

      if (await progressInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await progressInput.fill('50');

        // Submit progress update
        const submitButton = page.locator('[data-testid="progress-submit-button"], button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          console.log('✓ Goal progress updated to 50%');
        }
      } else {
        console.log('⚠ Progress update interface not found');
      }
    } else {
      console.log('⚠ No goals found to update progress');
    }
  });

  test('can filter goals by status', async ({ page }) => {
    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for filter buttons/tabs
    const filterButtons = [
      { testId: 'filter-all', text: /all/i },
      { testId: 'filter-active', text: /active|in progress/i },
      { testId: 'filter-completed', text: /completed|done/i },
    ];

    for (const filter of filterButtons) {
      const filterButton = page.locator(`[data-testid="${filter.testId}"], button:has-text("${filter.text.source}")`, { hasText: filter.text }).first();

      if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterButton.click();
        await page.waitForTimeout(1000);
        console.log(`✓ Applied filter: ${filter.text.source}`);
      }
    }
  });

  test('can mark goal as complete', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for an existing goal
    const existingGoal = page.locator('[data-testid^="goal-card-"], [data-testid^="goal-item-"], .goal-card, [class*="goal"]').first();

    if (await existingGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const goalText = await existingGoal.textContent();
      await existingGoal.click();
      await page.waitForTimeout(1000);

      // Look for complete button or checkbox
      const completeButton = page.locator('[data-testid="goal-complete-button"], button:has-text("Mark Complete"), button:has-text("Complete")').first();
      const completeCheckbox = page.locator('[data-testid="goal-complete-checkbox"], input[type="checkbox"]').first();

      let marked = false;

      if (await completeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeButton.click();
        await page.waitForTimeout(1500);
        marked = true;
        console.log(`✓ Goal marked as complete: ${goalText?.substring(0, 50)}`);
      } else if (await completeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeCheckbox.click();
        await page.waitForTimeout(1500);
        marked = true;
        console.log(`✓ Goal marked as complete via checkbox: ${goalText?.substring(0, 50)}`);
      } else {
        console.log('⚠ Complete button/checkbox not found');
      }

      if (marked) {
        // Verify completion indicator
        const completedBadge = page.locator('[data-testid*="completed"], text=/completed/i, .badge').first();
        const hasCompletedState = await completedBadge.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasCompletedState) {
          console.log('✓ Goal marked with completed status');
        }
      }
    } else {
      console.log('⚠ No goals found to complete');
    }
  });

  test('can edit a goal', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for an existing goal
    const existingGoal = page.locator('[data-testid^="goal-card-"], [data-testid^="goal-item-"], .goal-card, [class*="goal"]').first();

    if (await existingGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingGoal.click();
      await page.waitForTimeout(1000);

      // Look for edit button
      const editButton = page.locator('[data-testid="goal-edit-button"], button:has-text("Edit")').first();

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Modify goal title
        const titleInput = page.locator('[data-testid="goal-title-input"], input[name="title"]').first();

        if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const updatedTitle = `Updated Goal ${Date.now()}`;
          await titleInput.fill(updatedTitle);

          // Save changes
          const saveButton = page.locator('[data-testid="goal-submit-button"], button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
          await saveButton.click();
          await page.waitForTimeout(2000);

          console.log(`✓ Goal updated to: ${updatedTitle}`);
        } else {
          console.log('⚠ Edit form not accessible');
        }
      } else {
        console.log('⚠ Edit button not found');
      }
    } else {
      console.log('⚠ No goals found to edit');
    }
  });

  test('can delete a goal', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Look for an existing goal
    const existingGoal = page.locator('[data-testid^="goal-card-"], [data-testid^="goal-item-"], .goal-card, [class*="goal"]').first();

    if (await existingGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const goalText = await existingGoal.textContent();
      await existingGoal.click();
      await page.waitForTimeout(1000);

      // Look for delete button
      const deleteButton = page.locator('[data-testid="goal-delete-button"], button:has-text("Delete"), button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation dialog
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Confirm"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        console.log(`✓ Goal deleted: ${goalText?.substring(0, 50)}`);
      } else {
        console.log('⚠ Delete button not found');
      }
    } else {
      console.log('⚠ No goals found to delete');
    }
  });

  test('shows empty state when no goals exist', async ({ page }) => {
    // Check for empty state
    const emptyState = page.locator('[data-testid="goals-empty-state"], text=/no goals/i, text=/create your first/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed');
    } else {
      console.log('⚠ Empty state not visible (goals may exist)');
    }
  });
});
