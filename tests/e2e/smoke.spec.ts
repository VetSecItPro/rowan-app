import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

// Use pro user for smoke tests (any authenticated user works)
const SMOKE_USER = TEST_USERS.pro;

async function getCsrfToken(page: import('@playwright/test').Page): Promise<string> {
  // Retry CSRF token fetch — dev server may be slow under concurrent load
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await page.request.get('/api/csrf/token', { timeout: 30000 });
      if (response.ok()) {
        const payload = await response.json();
        return payload.token as string;
      }
    } catch (error) {
      // Timeout or network error — log and retry
      console.warn(`CSRF token fetch attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : String(error));
    }
    // Wait before retry (fixed 2s, not exponential)
    if (attempt < 1) await page.waitForTimeout(2000);
  }
  throw new Error('Failed to fetch CSRF token after 2 attempts');
}

/**
 * Build fresh auth headers with a new CSRF token.
 * The middleware rotates the CSRF token after every state-changing request,
 * so we must re-fetch before each mutation to avoid 403 stale-token errors.
 */
async function freshHeaders(page: import('@playwright/test').Page) {
  const token = await getCsrfToken(page);
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
  };
}

async function getPrimarySpaceId(page: import('@playwright/test').Page): Promise<string> {
  // Navigate to dashboard first to ensure auth cookies are active in the browser context.
  // In CI, page.request may not carry cookies until a page navigation establishes them.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Retry — the first API call after auth setup may fail while session hydrates.
  // Space provisioning trigger runs async and can lag under CI load.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await page.request.get('/api/spaces', { timeout: 30000 });
    if (response.ok()) {
      const result = await response.json();
      const spaces = result.data || result;
      const spaceId = Array.isArray(spaces) ? spaces[0]?.id : spaces?.[0]?.id;
      if (spaceId) return spaceId;
      console.warn(`[Smoke] /api/spaces returned OK but no spaces found (attempt ${attempt + 1})`);
    } else {
      const body = await response.text().catch(() => '(unreadable)');
      console.warn(`[Smoke] /api/spaces returned ${response.status()} (attempt ${attempt + 1}): ${body.substring(0, 200)}`);
    }
    if (attempt < 1) await page.waitForTimeout(5000);
  }
  throw new Error('Failed to get primary space ID after 2 attempts');
}

test.describe('Smoke Flow', () => {
  // Use pre-authenticated pro user session (any authenticated user works for smoke tests)
  test.use({ storageState: 'tests/e2e/.auth/pro.json' });

  /**
   * Verifies core app flows end-to-end: tasks, reminders, meals, shopping,
   * bulk operations, and data exports all respond correctly for a pro user.
   * Each API step includes body logging so failures are diagnosable in CI.
   *
   * Shopping list visibility fix (2026-05-07): The /shopping page uses
   * React Query with auth-gating (enabled: !!spaceId && !!user). After
   * page.goto, networkidle fires when HTML/CSS/JS settles, but the
   * auth check + Supabase shopping_lists fetch are sequential async steps
   * that happen client-side AFTER networkidle resolves. We register
   * waitForResponse targeting the Supabase REST shopping_lists endpoint
   * BEFORE page.goto so Playwright waits for that specific fetch to
   * complete before asserting list visibility.
   *
   * UN-SKIP 2026-05-08 (real fix shipped): the shopping segment was
   * rewritten to drive list creation through the in-app "New Shopping
   * List" button instead of POST /api/shopping. The previous failure
   * mode was a React Query cache mismatch — `waitForResponse` confirmed
   * the lists fetch returned the new title, but the renderer query
   * served a stale cached value, so `filteredLists` didn't include the
   * new list and the testid never appeared. Driving creation via the
   * UI mutation makes useShoppingHandlers' `onSuccess` invalidate
   * QUERY_KEYS.shopping.lists, which forces a fresh fetch + render.
   *
   * Required testids (added in this PR):
   *   • `new-shopping-list-button` on `/shopping` page (opens modal)
   *   • `shopping-list-title-input` in NewShoppingListModal (title field)
   *   • `shopping-list-submit-button` on the modal's CTA submit
   * Existing: `shopping-list-card-${id}` on ShoppingListCard (PR #383).
   *
   * Sharing toggle continues to use PATCH /api/shopping/[id]/sharing —
   * that endpoint is API-only by design (Polar customer-portal-style
   * link out, no in-app button), and React Query invalidation isn't
   * needed for that step since the test only asserts the card stays
   * visible after the toggle, not the visual is_public state.
   */
  test('login and core flows work end-to-end', async ({ page }) => {
    // Smoke test makes many sequential API calls — needs extra time
    // Under parallel test load, individual API calls may be slow (rate limiting, server load)
    test.setTimeout(300000);

    // Ensure pro user session is valid (re-authenticates if expired)
    await ensureAuthenticated(page, 'pro');

    const spaceId = await getPrimarySpaceId(page);

    // Tasks: create + update
    // Supabase's getUser() can intermittently fail in CI even after ensureAuthenticated
    // passes — retry once with re-authentication on 401
    const taskTitle = `Smoke Task ${Date.now()}`;
    let taskCreate = await page.request.post('/api/tasks', {
      data: { space_id: spaceId, title: taskTitle },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (taskCreate.status() === 401) {
      console.warn('Task create returned 401 — re-authenticating and retrying...');
      await ensureAuthenticated(page, 'pro');
      taskCreate = await page.request.post('/api/tasks', {
        data: { space_id: spaceId, title: taskTitle },
        headers: await freshHeaders(page),
        timeout: 30000,
      });
    }
    if (!taskCreate.ok()) {
      const body = await taskCreate.text().catch(() => '(unreadable)');
      throw new Error(`Task create failed: ${taskCreate.status()} ${body}`);
    }
    const taskData = await taskCreate.json();
    const taskId = taskData.data?.id as string;
    const updatedTaskTitle = `${taskTitle} Updated`;
    const taskUpdate = await page.request.patch(`/api/tasks/${taskId}`, {
      data: { title: updatedTaskTitle },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!taskUpdate.ok()) {
      const body = await taskUpdate.text().catch(() => '(unreadable)');
      throw new Error(`Task update failed: ${taskUpdate.status()} ${body}`);
    }

    await page.goto('/tasks');
    await expect(page.locator(`text=${updatedTaskTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Reminders: create + update
    const reminderTitle = `Smoke Reminder ${Date.now()}`;
    const reminderCreate = await page.request.post('/api/reminders', {
      data: {
        space_id: spaceId,
        title: reminderTitle,
        reminder_time: new Date().toISOString(),
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!reminderCreate.ok()) {
      const body = await reminderCreate.text().catch(() => '(unreadable)');
      throw new Error(`Reminder create failed: ${reminderCreate.status()} ${body}`);
    }
    const reminderData = await reminderCreate.json();
    const reminderId = reminderData.data?.id as string;
    const reminderUpdate = await page.request.patch(`/api/reminders/${reminderId}`, {
      data: { title: `${reminderTitle} Updated` },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!reminderUpdate.ok()) {
      const body = await reminderUpdate.text().catch(() => '(unreadable)');
      throw new Error(`Reminder update failed: ${reminderUpdate.status()} ${body}`);
    }

    await page.goto('/reminders');
    await page.waitForLoadState('domcontentloaded');

    // Meals: create + update
    // Note: DB column is "name" (not "recipe_name") per migration 20251012000002
    const mealName = `Smoke Meal ${Date.now()}`;
    const mealCreate = await page.request.post('/api/meals', {
      data: {
        space_id: spaceId,
        meal_type: 'dinner',
        scheduled_date: new Date().toISOString().split('T')[0],
        name: mealName,
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!mealCreate.ok()) {
      const body = await mealCreate.text().catch(() => '(unreadable)');
      throw new Error(`Meal create failed: ${mealCreate.status()} ${body}`);
    }
    const mealData = await mealCreate.json();
    const mealId = mealData.data?.id as string;
    // Small delay so the meal-create write fully lands before the update.
    // Under CI load the API can return 200 on create before the row is
    // queryable for PATCH (replication / cache lag).
    await page.waitForTimeout(500);
    const mealUpdate = await page.request.patch(`/api/meals/${mealId}`, {
      data: {
        notes: 'Updated by smoke test',
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!mealUpdate.ok()) {
      const body = await mealUpdate.text().catch(() => '(unreadable)');
      throw new Error(`Meal update failed: ${mealUpdate.status()} ${body}`);
    }

    await page.goto('/meals');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Meal is in a compact calendar card where the <p> may be clipped by overflow.
    // Verify DOM presence (not visual visibility) since API already confirmed create/update.
    await expect(page.locator(`text=${mealName}`).first()).toBeAttached({ timeout: 10000 });

    // Shopping list: drive creation through the in-app UI flow so React
    // Query's mutation onSuccess properly invalidates QUERY_KEYS.shopping.lists.
    // Creating via POST /api/shopping bypasses the client-side mutation
    // hook and leaves the in-browser cache stale; the renderer reads the
    // stale list and the new card never appears (re-skip note 2026-05-07).
    const listTitle = `Smoke List ${Date.now()}`;
    await page.goto('/shopping');
    await page.waitForLoadState('domcontentloaded');

    // Open the New Shopping List modal
    const openBtn = page.getByTestId('new-shopping-list-button');
    await openBtn.waitFor({ state: 'visible', timeout: 15000 });
    await openBtn.click();

    // Fill the title and submit. Press Enter to submit the form rather
    // than clicking the CTAButton — that button has continuous breathing
    // + ripple CSS animations (animationLevel="dynamic" set on CTAButton),
    // so Playwright's "wait for element to be stable" actionability check
    // never resolves. The submit button has `form="new-shopping-list-form"`
    // which means the form's onSubmit fires on Enter from any of its inputs.
    const titleInput = page.getByTestId('shopping-list-title-input');
    await titleInput.waitFor({ state: 'visible', timeout: 10000 });
    await titleInput.fill(listTitle);
    await titleInput.press('Enter');

    // Wait for the SERVER-CONFIRMED card (testid carrying the real DB UUID,
    // not the temp- optimistic ID). useShoppingHandlers.handleCreateList
    // does an optimistic insert with `id: \`temp-${Date.now()}\`` so the
    // card appears instantly, then `invalidateShopping()` after the server
    // POST replaces it with the real list. The `:not(...)` selector here
    // excludes the optimistic row so we extract the real UUID for the
    // sharing PATCH that follows. Without this filter, the PATCH 404s on
    // the temp- id (the API has no row by that key).
    const newCard = page.locator(
      '[data-testid^="shopping-list-card-"]:not([data-testid^="shopping-list-card-temp-"])'
    ).filter({ hasText: listTitle });
    await expect(newCard).toBeVisible({ timeout: 25000 });

    // Extract listId from the testid attribute for the sharing PATCH below.
    const cardTestid = await newCard.getAttribute('data-testid');
    const listId = cardTestid?.replace('shopping-list-card-', '') ?? '';
    if (!listId || listId.startsWith('temp-')) {
      throw new Error(`Could not extract real listId from card testid: "${cardTestid}"`);
    }

    // Sharing toggle — API path is the right call here (no in-app button
    // for "make public"; product spec is link-out via Polar-style portal).
    const listShareToggle = await page.request.patch(`/api/shopping/${listId}/sharing`, {
      data: { isPublic: true },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!listShareToggle.ok()) {
      const body = await listShareToggle.text().catch(() => '(unreadable)');
      throw new Error(`Shopping share toggle failed: ${listShareToggle.status()} ${body}`);
    }

    // Re-assert the card is still present after the API toggle. This is
    // a sanity check against accidental delete-on-share regressions.
    await expect(page.getByTestId(`shopping-list-card-${listId}`)).toBeVisible({ timeout: 5000 });

    // Bulk delete + archive (smoke test endpoints).
    // Both GET query params and POST options use ISO-8601 datetime form
    // (the Zod validator on /api/bulk/delete-expenses requires `T...Z`).
    // Plain `YYYY-MM-DD` was rejected with 400 invalid_format.
    const bulkDeleteCount = await page.request.get(
      `/api/bulk/delete-expenses?space_id=${spaceId}&start_date=2000-01-01T00:00:00.000Z&end_date=2000-01-02T00:00:00.000Z`,
      { timeout: 30000 },
    );
    if (!bulkDeleteCount.ok()) {
      const body = await bulkDeleteCount.text().catch(() => '(unreadable)');
      throw new Error(`Bulk delete-expenses GET failed: ${bulkDeleteCount.status()} ${body}`);
    }

    const bulkDelete = await page.request.post('/api/bulk/delete-expenses', {
      data: {
        space_id: spaceId,
        options: {
          startDate: '2000-01-01T00:00:00.000Z',
          endDate: '2000-01-02T00:00:00.000Z',
        },
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!bulkDelete.ok()) {
      const body = await bulkDelete.text().catch(() => '(unreadable)');
      throw new Error(`Bulk delete-expenses POST failed: ${bulkDelete.status()} ${body}`);
    }

    const bulkArchive = await page.request.post('/api/bulk/archive-old-data', {
      data: {
        space_id: spaceId,
        data_type: 'tasks',
        older_than_date: '2000-01-01',
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!bulkArchive.ok()) {
      const body = await bulkArchive.text().catch(() => '(unreadable)');
      throw new Error(`Bulk archive-old-data POST failed: ${bulkArchive.status()} ${body}`);
    }

    // Data export: JSON/CSV/PDF
    const jsonExport = await page.request.get('/api/user/export-data', { timeout: 30000 });
    if (!jsonExport.ok()) {
      const body = await jsonExport.text().catch(() => '(unreadable)');
      throw new Error(`JSON export failed: ${jsonExport.status()} ${body}`);
    }
    expect(jsonExport.headers()['content-type']).toContain('application/json');

    // Note: type=all returns JSON with all CSVs bundled; use type=tasks for actual CSV response
    const csvExport = await page.request.get('/api/user/export-data-csv?type=tasks', { timeout: 30000 });
    // 404 = no data available is acceptable for new test user
    if (![200, 404].includes(csvExport.status())) {
      const body = await csvExport.text().catch(() => '(unreadable)');
      throw new Error(`CSV export failed: ${csvExport.status()} ${body}`);
    }
    if (csvExport.ok()) {
      expect(csvExport.headers()['content-type']).toContain('text/csv');
    }

    const pdfExport = await page.request.get('/api/user/export-data-pdf?type=all', { timeout: 30000 });
    if (!pdfExport.ok()) {
      const body = await pdfExport.text().catch(() => '(unreadable)');
      throw new Error(`PDF export failed: ${pdfExport.status()} ${body}`);
    }
    expect(pdfExport.headers()['content-type']).toContain('application/pdf');

    // Admin notification export
    const adminLogin = await page.request.post('/api/admin/auth/login', {
      data: {
        email: SMOKE_USER.email,
        password: SMOKE_USER.password,
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!adminLogin.ok()) {
      const body = await adminLogin.text().catch(() => '(unreadable)');
      throw new Error(`Admin login failed: ${adminLogin.status()} ${body}`);
    }

    const adminExport = await page.request.post('/api/admin/notifications/export', {
      data: { includeAll: true, format: 'csv' },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!adminExport.ok()) {
      const body = await adminExport.text().catch(() => '(unreadable)');
      throw new Error(`Admin notifications export failed: ${adminExport.status()} ${body}`);
    }
    expect(adminExport.headers()['content-type']).toContain('text/csv');
  });
});
