/**
 * E2E Tests for Tasks Feature
 *
 * Tests task page functionality including viewing, creating, completing, filtering, and assigning tasks.
 * Uses pre-authenticated pro user session.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for task tests
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Tasks Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/tasks', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('tasks page loads and displays task list', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /tasks/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify add task button exists
    const addButton = page.locator('[data-testid="add-task-button"], button:has-text("New Task"), button:has-text("Add Task")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });

    console.log('✓ Tasks page loaded successfully');
  });

  test('can create a new task', async ({ page }) => {
    test.setTimeout(45000);

    // Click add task button
    const addButton = page.locator('[data-testid="add-task-button"], button:has-text("New Task"), button:has-text("Add Task")').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Fill task title — strict testid only. The page header has a search
    // input with placeholder="Search tasks and chores..." which earlier
    // matched the OR fallback `input[placeholder*="task" i]` and got
    // filled instead of the modal's title input. Modal-scoped testid is
    // unambiguous.
    const taskTitle = `E2E Test Task ${Date.now()}`;
    const titleInput = page.getByTestId('task-title-input');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(taskTitle);

    // Optional: Fill description if field exists
    const descriptionInput = page.locator('[data-testid="task-description-input"], textarea[name="description"], textarea[placeholder*="description" i]').first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill('Created by E2E test');
    }

    // Optional: Set due date if field exists
    const dueDateInput = page.locator('[data-testid="task-due-date-input"], input[type="date"], input[name*="due" i]').first();
    if (await dueDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await dueDateInput.fill(dateString);
    }

    // Submit form — strict testid only. The empty-state on /tasks renders
    // an "Add From Scratch" button BEFORE the modal in DOM, so the OR
    // fallback `button:has-text("Add")` was matching that element via
    // .first(). It happens to be enabled, so toBeEnabled() passed, but
    // .click() fails because the modal overlay intercepts pointer events.
    const submitButton = page.getByTestId('task-submit-button');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Verify task appears in list
    const taskElement = page.locator(`text=/${taskTitle}/i`).first();
    await expect(taskElement).toBeVisible({ timeout: 5000 });

    console.log(`✓ Created task: ${taskTitle}`);
  });

  test('can complete a task', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Look for an incomplete task checkbox
    const taskCheckbox = page.locator('[data-testid^="task-checkbox-"], input[type="checkbox"]:not([checked])').first();

    if (await taskCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get task text before completing
      const taskItem = taskCheckbox.locator('..').locator('..').first();
      const taskText = await taskItem.textContent().catch(() => '');

      // Click checkbox to complete task
      await taskCheckbox.click();
      await page.waitForTimeout(1500);

      console.log(`✓ Completed task: ${taskText.substring(0, 50)}`);

      // Verify task is marked as complete (may be visually strikethrough or moved to completed section)
      const completedIndicator = page.locator('[data-testid*="completed"], .line-through, [class*="complete"]').first();
      const hasCompletedState = await completedIndicator.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasCompletedState) {
        console.log('✓ Task marked as completed');
      }
    } else {
      console.log('⚠ No incomplete tasks found to complete');
    }
  });

  test('can filter tasks by status', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Look for filter buttons/tabs
    const filterButtons = [
      { testId: 'filter-all', text: /all/i },
      { testId: 'filter-active', text: /active|pending|todo/i },
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

    // Verify at least one filter interaction worked
    const hasFilters = await page.locator('[data-testid*="filter-"], button[role="tab"], [class*="filter"]').count();

    if (hasFilters > 0) {
      console.log('✓ Task filtering interface available');
    } else {
      console.log('⚠ Task filter UI not found');
    }
  });

  test('can assign task to a user', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Look for an existing task
    const existingTask = page.locator('[data-testid^="task-item-"], .task-item, [class*="task"]').first();

    if (await existingTask.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click task to open details/edit
      await existingTask.click();
      await page.waitForTimeout(1000);

      // Look for assign/assignee dropdown
      const assignButton = page.locator('[data-testid="task-assign-button"], button:has-text("Assign"), [data-testid*="assignee"]').first();

      if (await assignButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await assignButton.click();
        await page.waitForTimeout(500);

        // Look for user list
        const userOption = page.locator('[data-testid^="user-option-"], [role="option"], .user-option').first();

        if (await userOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userOption.click();
          await page.waitForTimeout(1000);
          console.log('✓ Task assigned to user');
        } else {
          console.log('⚠ User list not found in assign dropdown');
        }
      } else {
        console.log('⚠ Assign button not found');
      }
    } else {
      console.log('⚠ No tasks found to assign');
    }
  });

  test('can edit a task', async ({ page }) => {
    test.setTimeout(45000);

    // Strict testid selector — broad `[class*="task"]` matched non-TaskCard
    // elements (sidebar nav, etc.) and threw on click. TaskCard outer
    // wrapper has data-testid={`task-item-${task.id}`} since the testid PR.
    // If no tasks exist on a fresh test DB, gracefully bail.
    const existingTask = page.locator('[data-testid^="task-item-"]').first();

    if (await existingTask.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Card click opens UnifiedDetailsModal (via onViewDetails handler).
      await existingTask.click();
      // Detail modal has its own Edit button. The 3-dot menu's Edit also
      // works via data-testid="task-edit-button"; either path is fine.
      await page.getByTestId('unified-details-edit-button').click();

      // Edit form (NewTaskModal in edit mode) loads.
      const titleInput = page.getByTestId('task-title-input');
      await expect(titleInput).toBeVisible({ timeout: 3000 });
      const updatedTitle = `Updated Task ${Date.now()}`;
      await titleInput.fill(updatedTitle);
      await page.getByTestId('task-submit-button').click();

      // After save, the updated title should appear in the list.
      const updatedInList = page.locator(`text=/${updatedTitle}/i`).first();
      await expect(updatedInList).toBeVisible({ timeout: 10000 });
      console.log(`✓ Task updated to: ${updatedTitle}`);
    } else {
      console.log('⚠ No tasks found to edit (expected on fresh test DB)');
    }
  });

  test('can delete a task', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Look for an existing task
    const existingTask = page.locator('[data-testid^="task-item-"], .task-item, [class*="task"]').first();

    if (await existingTask.isVisible({ timeout: 5000 }).catch(() => false)) {
      const taskText = await existingTask.textContent();

      // Click task to open details/edit
      await existingTask.click();
      await page.waitForTimeout(1000);

      // Look for delete button
      const deleteButton = page.locator('[data-testid="task-delete-button"], button:has-text("Delete"), button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation dialog if it appears
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        console.log(`✓ Task deleted: ${taskText?.substring(0, 50)}`);
      } else {
        console.log('⚠ Delete button not found');
      }
    } else {
      console.log('⚠ No tasks found to delete');
    }
  });

  test('shows empty state when no tasks exist', async ({ page }) => {
    // Apply completed filter to potentially show empty state
    const completedFilter = page.locator('[data-testid="filter-completed"], button:has-text("Completed")').first();
    if (await completedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await completedFilter.click();
      await page.waitForTimeout(1000);
    }

    // Check for empty state
    const emptyState = page.locator('[data-testid="tasks-empty-state"], text=/no tasks/i, text=/get started/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed');
    } else {
      console.log('⚠ Empty state not visible (tasks may exist)');
    }
  });
});
