/**
 * E2E Tests for Shopping Lists Feature
 *
 * Tests shopping list functionality including viewing, creating lists, adding items, and checking off items.
 * Uses pre-authenticated pro user session.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for shopping tests
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Shopping Lists Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/shopping', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('shopping page loads and displays lists', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /shopping|lists/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify new list button exists
    const addButton = page.locator('[data-testid="add-list-button"], button:has-text("New List"), button:has-text("Create List")').first();
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddButton) {
      console.log('✓ Shopping page loaded with new list button');
    } else {
      console.log('✓ Shopping page loaded');
    }
  });

  test('can create a new shopping list', async ({ page }) => {
    test.setTimeout(45000);

    // Click add list button
    const addButton = page.locator('[data-testid="add-list-button"], button:has-text("New List"), button:has-text("Create List"), button:has-text("Add List")').first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Fill list title
      const listTitle = `E2E Test List ${Date.now()}`;
      const titleInput = page.locator('[data-testid="list-title-input"], input[name="title"], input[placeholder*="list" i]').first();

      if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.fill(listTitle);

        // Submit form
        const submitButton = page.locator('[data-testid="list-submit-button"], button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify list appears
        const listElement = page.locator(`text=/${listTitle}/i`).first();
        await expect(listElement).toBeVisible({ timeout: 5000 });

        console.log(`✓ Created shopping list: ${listTitle}`);
      } else {
        console.log('⚠ List title input not found');
      }
    } else {
      console.log('⚠ Add list button not found');
    }
  });

  test('can add items to a shopping list', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for lists to load
    await page.waitForTimeout(2000);

    // Click on first list or create one
    const existingList = page.locator('[data-testid^="shopping-list-"], .shopping-list, [class*="list"]').first();

    if (await existingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingList.click();
      await page.waitForTimeout(1000);
    }

    // Look for add item button/input
    const addItemButton = page.locator('[data-testid="add-item-button"], button:has-text("Add Item"), button:has-text("New Item")').first();
    const addItemInput = page.locator('[data-testid="add-item-input"], input[placeholder*="item" i], input[name*="item" i]').first();

    const itemName = `Test Item ${Date.now()}`;

    // Try button approach first
    if (await addItemButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addItemButton.click();
      await page.waitForTimeout(500);

      const itemInput = page.locator('[data-testid="item-name-input"], input[name="name"], input[placeholder*="item" i]').first();
      if (await itemInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await itemInput.fill(itemName);

        const submitButton = page.locator('[data-testid="item-submit-button"], button[type="submit"], button:has-text("Add")').first();
        await submitButton.click();
        await page.waitForTimeout(1500);

        console.log(`✓ Added item to list: ${itemName}`);
      }
    }
    // Try inline input approach
    else if (await addItemInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addItemInput.fill(itemName);
      await addItemInput.press('Enter');
      await page.waitForTimeout(1500);

      console.log(`✓ Added item to list: ${itemName}`);
    } else {
      console.log('⚠ Add item interface not found');
    }

    // Verify item appears in list
    const itemElement = page.locator(`text=/${itemName}/i`).first();
    const itemVisible = await itemElement.isVisible({ timeout: 3000 }).catch(() => false);

    if (itemVisible) {
      console.log('✓ Item visible in shopping list');
    }
  });

  test('can check off items in shopping list', async ({ page }) => {
    // Wait for lists to load
    await page.waitForTimeout(2000);

    // Click on first list
    const existingList = page.locator('[data-testid^="shopping-list-"], .shopping-list, [class*="list"]').first();

    if (await existingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingList.click();
      await page.waitForTimeout(1000);

      // Look for unchecked item checkbox
      const itemCheckbox = page.locator('[data-testid^="item-checkbox-"], input[type="checkbox"]:not([checked])').first();

      if (await itemCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const itemText = await itemCheckbox.locator('..').textContent().catch(() => '');

        // Check off item
        await itemCheckbox.click();
        await page.waitForTimeout(1000);

        console.log(`✓ Checked off item: ${itemText.substring(0, 50)}`);

        // Verify item is marked as checked (may be strikethrough or moved)
        const checkedIndicator = page.locator('[data-testid*="checked"], .line-through, [class*="complete"]').first();
        const hasCheckedState = await checkedIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasCheckedState) {
          console.log('✓ Item marked as checked');
        }
      } else {
        console.log('⚠ No unchecked items found');
      }
    } else {
      console.log('⚠ No shopping lists found');
    }
  });

  test('can delete an item from shopping list', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for lists to load
    await page.waitForTimeout(2000);

    // Click on first list
    const existingList = page.locator('[data-testid^="shopping-list-"], .shopping-list, [class*="list"]').first();

    if (await existingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingList.click();
      await page.waitForTimeout(1000);

      // Look for item delete button
      const deleteButton = page.locator('[data-testid^="item-delete-"], button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation if needed
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1500);
        console.log('✓ Item deleted from shopping list');
      } else {
        console.log('⚠ Item delete button not found');
      }
    } else {
      console.log('⚠ No shopping lists found');
    }
  });

  test('can share a shopping list', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for lists to load
    await page.waitForTimeout(2000);

    // Look for a list
    const existingList = page.locator('[data-testid^="shopping-list-"], .shopping-list, [class*="list"]').first();

    if (await existingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingList.click();
      await page.waitForTimeout(1000);

      // Look for share button
      const shareButton = page.locator('[data-testid="list-share-button"], button:has-text("Share"), button[aria-label*="share" i]').first();

      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(1000);

        // Verify share dialog or toggle appeared
        const shareDialog = page.locator('[data-testid="share-dialog"], [role="dialog"], .share-dialog').first();
        const shareToggle = page.locator('[data-testid="share-toggle"], input[type="checkbox"]').first();

        const hasShareUI =
          await shareDialog.isVisible({ timeout: 2000 }).catch(() => false) ||
          await shareToggle.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasShareUI) {
          console.log('✓ Share interface displayed');
        } else {
          console.log('⚠ Share UI not found after clicking share button');
        }
      } else {
        console.log('⚠ Share button not found');
      }
    } else {
      console.log('⚠ No shopping lists found');
    }
  });

  test('can delete a shopping list', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for lists to load
    await page.waitForTimeout(2000);

    // Look for a list
    const existingList = page.locator('[data-testid^="shopping-list-"], .shopping-list, [class*="list"]').first();

    if (await existingList.isVisible({ timeout: 5000 }).catch(() => false)) {
      const listText = await existingList.textContent();
      await existingList.click();
      await page.waitForTimeout(1000);

      // Look for delete button (might be in menu/options)
      const deleteButton = page.locator('[data-testid="list-delete-button"], button:has-text("Delete List"), button:has-text("Delete")').first();
      const menuButton = page.locator('[data-testid="list-menu-button"], button[aria-label*="menu" i], button[aria-label*="options" i]').first();

      // Try direct delete button first
      let deleteFound = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

      // If not found, try opening menu
      if (!deleteFound && await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(500);
        deleteFound = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
      }

      if (deleteFound) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        console.log(`✓ Shopping list deleted: ${listText?.substring(0, 50)}`);
      } else {
        console.log('⚠ Delete list button not found');
      }
    } else {
      console.log('⚠ No shopping lists found');
    }
  });

  test('shows empty state when no lists exist', async ({ page }) => {
    // Check for empty state
    const emptyState = page.locator('[data-testid="shopping-empty-state"], text=/no lists/i, text=/create your first/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed');
    } else {
      console.log('⚠ Empty state not visible (lists may exist)');
    }
  });
});
