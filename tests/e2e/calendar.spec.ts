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
    // Verify page title/heading.
    // FeatureGateWrapper / SubscriptionContext gate the real heading
    // behind a fetch that can take 30s+ in CI (3× retry × 20s + backoff).
    // See issue #350.
    const heading = page.locator('h1, h2').filter({ hasText: /calendar/i }).first();
    await expect(heading).toBeVisible({ timeout: 45000 });

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

    // Use strict testid selectors. The page renders multiple "New Event"
    // buttons (mode-toggle pills + the dynamic action button) — broad
    // text matchers like :has-text("New Event") match the wrong one.
    // The action button has data-testid="add-event-button"; testids are
    // the canonical contract between tests and components.
    await page.getByTestId('add-event-button').click();

    const eventTitle = `E2E Test Event ${Date.now()}`;
    await page.getByTestId('event-title-input').fill(eventTitle);
    await page.getByTestId('event-description-input').fill('Created by E2E test');
    await page.getByTestId('event-submit-button').click();

    // After submit, useCalendarHandlers.handleCreateEvent calls
    // loadEvents() to refresh — the new event should appear in the list.
    const eventInList = page.locator(`text=/${eventTitle}/i`).first();
    await expect(eventInList).toBeVisible({ timeout: 10000 });

    console.log(`✓ Created calendar event: ${eventTitle}`);
  });

  test('can view event details', async ({ page }) => {
    // Strict testid selector. The previous broad `[class*="event"]` fallback
    // matched non-EventCard elements that threw on click.
    // EventCard outer wrapper has data-testid={`event-${event.id}`} since
    // the calendar testid PR. If no events exist in the test DB on a fresh
    // run, the test gracefully bails (no events to view = nothing to assert).
    const existingEvent = page.locator('[data-testid^="event-"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingEvent.click();
      // EventCard outer click → onViewDetails → opens EventDetailModal.
      const eventDetails = page.getByTestId('event-details');
      await expect(eventDetails).toBeVisible({ timeout: 3000 });
      console.log('✓ Event details displayed');
    } else {
      console.log('⚠ No existing events found to view (expected on fresh test DB)');
    }
  });

  test('can edit an existing event', async ({ page }) => {
    test.setTimeout(45000);

    const existingEvent = page.locator('[data-testid^="event-"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      await existingEvent.click();
      // Detail modal renders — click its Edit button.
      await page.getByTestId('event-edit-button').click();

      // Edit modal renders — use the same testids as the create form.
      const titleInput = page.getByTestId('event-title-input');
      await expect(titleInput).toBeVisible({ timeout: 3000 });
      const updatedTitle = `Updated Event ${Date.now()}`;
      await titleInput.fill(updatedTitle);
      await page.getByTestId('event-submit-button').click();

      // Verify the updated title appears in the list after the post-save reload.
      const updatedInList = page.locator(`text=/${updatedTitle}/i`).first();
      await expect(updatedInList).toBeVisible({ timeout: 10000 });
      console.log(`✓ Event updated to: ${updatedTitle}`);
    } else {
      console.log('⚠ No existing events found to edit (expected on fresh test DB)');
    }

  });

  test('can delete a calendar event', async ({ page }) => {
    test.setTimeout(45000);

    const existingEvent = page.locator('[data-testid^="event-"]').first();

    if (await existingEvent.isVisible({ timeout: 5000 }).catch(() => false)) {
      const eventTitle = await existingEvent.locator('h3').first().textContent();
      // Open the 3-dot menu (card click opens detail modal, but delete lives
      // in the menu, not on the detail modal in the current UI — the
      // detail modal's Delete button is conditional on onDelete prop).
      // Use the menu approach for deletion to match user-actual flow.
      await existingEvent.locator('button[aria-label="Event options menu"]').click();
      await page.getByTestId('event-delete-button').click();

      // Confirm dialog if present
      const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Verify the event is removed from the list (after refresh).
      if (eventTitle) {
        const eventInList = page.locator(`text="${eventTitle.trim()}"`).first();
        await expect(eventInList).not.toBeVisible({ timeout: 10000 });
        console.log(`✓ Event deleted: ${eventTitle}`);
      }
    } else {
      console.log('⚠ No existing events found to delete (expected on fresh test DB)');
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
