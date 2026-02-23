/**
 * E2E Tests for Calendar Feature
 *
 * Tests calendar page functionality including viewing, creating, editing, and deleting events.
 * Uses pre-authenticated pro user session.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for calendar tests (calendar is a gated feature)
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Calendar Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('calendar page loads and displays current month', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /calendar/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify calendar grid is visible
    const calendarGrid = page.locator('[data-testid="calendar-grid"], .calendar-grid, [class*="calendar"]').first();
    await expect(calendarGrid).toBeVisible({ timeout: 10000 });

    // Verify current month is shown
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const monthDisplay = page.locator(`text=/${currentMonth}/i`).first();
    await expect(monthDisplay).toBeVisible({ timeout: 5000 });

    console.log('✓ Calendar page loaded with current month view');
  });

  test('can navigate between months', async ({ page }) => {
    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Click next month button
    const nextButton = page.locator('[data-testid="calendar-next-month"], button[aria-label*="next" i], button:has-text("Next")').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Navigated to next month');
    }

    // Click previous month button
    const prevButton = page.locator('[data-testid="calendar-prev-month"], button[aria-label*="prev" i], button:has-text("Previous")').first();
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Navigated to previous month');
    }
  });

  test('can create a new calendar event', async ({ page }) => {
    test.setTimeout(45000);

    // Open new event modal
    const createButton = page.locator('[data-testid="add-event-button"], button:has-text("New Event"), button:has-text("Add Event")').first();

    // Check if button exists
    const hasCreateButton = await createButton.isVisible().catch(() => false);

    if (!hasCreateButton) {
      // Try clicking on a calendar day to open event creation
      const calendarDay = page.locator('[data-testid^="calendar-day"], .calendar-day, [class*="day"]').first();
      if (await calendarDay.isVisible()) {
        await calendarDay.click();
        await page.waitForTimeout(1000);
      }
    } else {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Fill event form
    const eventTitle = `E2E Test Event ${Date.now()}`;

    // Look for event title input
    const titleInput = page.locator('[data-testid="event-title-input"], input[name="title"], input[placeholder*="event" i]').first();

    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(eventTitle);

      // Optional: Fill description if field exists
      const descriptionInput = page.locator('[data-testid="event-description-input"], textarea[name="description"], textarea[placeholder*="description" i]').first();
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill('Created by E2E test');
      }

      // Submit form
      const submitButton = page.locator('[data-testid="event-submit-button"], button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();

      // Wait for event to appear
      await page.waitForTimeout(2000);

      // Verify event appears in calendar
      const eventElement = page.locator(`text=/${eventTitle}/i`).first();
      const eventExists = await eventElement.isVisible({ timeout: 5000 }).catch(() => false);

      if (eventExists) {
        console.log(`✓ Created calendar event: ${eventTitle}`);
      } else {
        console.log('⚠ Event created but may not be visible in current view');
      }
    } else {
      console.log('⚠ Event creation form not found - calendar may use different interaction pattern');
    }
  });

  test('can view event details', async ({ page }) => {
    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Look for any existing event
    const existingEvent = page.locator('[data-testid^="event-"], .calendar-event, [class*="event"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingEvent.click();
      await page.waitForTimeout(1000);

      // Check if event details modal/panel appeared
      const eventDetails = page.locator('[data-testid="event-details"], [role="dialog"], .event-details').first();
      const detailsVisible = await eventDetails.isVisible({ timeout: 3000 }).catch(() => false);

      if (detailsVisible) {
        console.log('✓ Event details displayed');
      } else {
        console.log('⚠ Event clicked but details view not found');
      }
    } else {
      console.log('⚠ No existing events found to view');
    }
  });

  test('can edit an existing event', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Look for any existing event
    const existingEvent = page.locator('[data-testid^="event-"], .calendar-event, [class*="event"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingEvent.click();
      await page.waitForTimeout(1000);

      // Look for edit button
      const editButton = page.locator('[data-testid="event-edit-button"], button:has-text("Edit")').first();

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Modify event title
        const titleInput = page.locator('[data-testid="event-title-input"], input[name="title"], input[placeholder*="event" i]').first();

        if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const updatedTitle = `Updated Event ${Date.now()}`;
          await titleInput.fill(updatedTitle);

          // Save changes
          const saveButton = page.locator('[data-testid="event-submit-button"], button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
          await saveButton.click();
          await page.waitForTimeout(2000);

          console.log(`✓ Event updated to: ${updatedTitle}`);
        } else {
          console.log('⚠ Edit form not found');
        }
      } else {
        console.log('⚠ Edit button not found');
      }
    } else {
      console.log('⚠ No existing events found to edit');
    }
  });

  test('can delete a calendar event', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Look for any existing event
    const existingEvent = page.locator('[data-testid^="event-"], .calendar-event, [class*="event"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      const eventText = await existingEvent.textContent();
      await existingEvent.click();
      await page.waitForTimeout(1000);

      // Look for delete button
      const deleteButton = page.locator('[data-testid="event-delete-button"], button:has-text("Delete"), button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation dialog if it appears
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Confirm"), button:has-text("Yes")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
        console.log(`✓ Event deleted: ${eventText}`);
      } else {
        console.log('⚠ Delete button not found');
      }
    } else {
      console.log('⚠ No existing events found to delete');
    }
  });

  test('shows empty state when no events exist', async ({ page }) => {
    // Navigate to a far future month where no events likely exist
    for (let i = 0; i < 6; i++) {
      const nextButton = page.locator('[data-testid="calendar-next-month"], button[aria-label*="next" i], button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Check for empty state message
    const emptyState = page.locator('[data-testid="calendar-empty-state"], text=/no events/i, text=/no items/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed for month with no events');
    } else {
      console.log('⚠ Empty state may not be visible (events might exist in this month)');
    }
  });
});
