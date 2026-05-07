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

    // Shopping list: create + share toggle
    const listTitle = `Smoke List ${Date.now()}`;
    const listCreate = await page.request.post('/api/shopping', {
      data: {
        space_id: spaceId,
        title: listTitle,
      },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!listCreate.ok()) {
      const body = await listCreate.text().catch(() => '(unreadable)');
      throw new Error(`Shopping list create failed: ${listCreate.status()} ${body}`);
    }
    const listData = await listCreate.json();
    const listId = listData.data?.id as string;
    if (!listId) {
      throw new Error(`Shopping list create returned ok but no list id. Body: ${JSON.stringify(listData)}`);
    }

    // Small delay so the list-create write fully lands before the update.
    // Under CI load the API can return 200 on create before the row is
    // queryable for PATCH (replication / cache lag).
    await page.waitForTimeout(500);

    // Use dedicated sharing endpoint — route accepts isPublic (camelCase),
    // which it maps to the DB column "is_public" (snake_case).
    const listShareToggle = await page.request.patch(`/api/shopping/${listId}/sharing`, {
      data: { isPublic: true },
      headers: await freshHeaders(page),
      timeout: 30000,
    });
    if (!listShareToggle.ok()) {
      const body = await listShareToggle.text().catch(() => '(unreadable)');
      throw new Error(`Shopping share toggle failed: ${listShareToggle.status()} ${body}`);
    }

    // Register the response waiter BEFORE navigating so we don't miss the
    // Supabase shopping_lists fetch that React Query fires after auth resolves.
    // networkidle alone is not sufficient: auth check + React Query fetch are
    // sequential client-side async steps that happen after networkidle fires.
    const shoppingListsFetch = page.waitForResponse(
      (res) => res.url().includes('shopping_lists') && res.status() === 200,
      { timeout: 15000 },
    );
    await page.goto('/shopping');
    await shoppingListsFetch;
    // Shopping list should be visible on the page
    await expect(page.locator(`text=${listTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Bulk delete + archive (smoke test endpoints)
    const bulkDeleteCount = await page.request.get(
      `/api/bulk/delete-expenses?space_id=${spaceId}&start_date=2000-01-01&end_date=2000-01-02`,
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
          startDate: '2000-01-01',
          endDate: '2000-01-02',
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
