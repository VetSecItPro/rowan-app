import { test, expect } from '@playwright/test';
import { loginAsUser, TEST_USERS } from './helpers/test-utils';

const SMOKE_USER = TEST_USERS.smoke;

async function setBetaBypassCookie(page: import('@playwright/test').Page) {
  const betaCookieValue = JSON.stringify({
    email: SMOKE_USER.email,
    isValid: true,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  await page.context().addCookies([
    {
      name: 'beta-validation',
      value: betaCookieValue,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

async function getCsrfToken(page: import('@playwright/test').Page): Promise<string> {
  const response = await page.request.get('/api/csrf/token');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.token as string;
}

async function getPrimarySpaceId(page: import('@playwright/test').Page): Promise<string> {
  const response = await page.request.get('/api/spaces');
  expect(response.ok()).toBeTruthy();
  const spaces = await response.json();
  const spaceId = spaces?.[0]?.id;
  expect(spaceId).toBeTruthy();
  return spaceId;
}

test.describe('Smoke Flow', () => {
  test('login and core flows work end-to-end', async ({ page }) => {
    await setBetaBypassCookie(page);
    await loginAsUser(page, 'smoke');

    const csrfToken = await getCsrfToken(page);
    const spaceId = await getPrimarySpaceId(page);
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    };

    // Tasks: create + update
    const taskTitle = `Smoke Task ${Date.now()}`;
    const taskCreate = await page.request.post('/api/tasks', {
      data: { space_id: spaceId, title: taskTitle },
      headers: authHeaders,
    });
    if (!taskCreate.ok()) {
      const body = await taskCreate.text();
      throw new Error(`Task create failed: ${taskCreate.status()} ${body}`);
    }
    const taskData = await taskCreate.json();
    const taskId = taskData.data?.id as string;
    const updatedTaskTitle = `${taskTitle} Updated`;
    const taskUpdate = await page.request.patch(`/api/tasks/${taskId}`, {
      data: { title: updatedTaskTitle },
      headers: authHeaders,
    });
    expect(taskUpdate.ok()).toBeTruthy();

    await page.goto('/tasks');
    await expect(page.locator(`text=${updatedTaskTitle}`).first()).toBeVisible();

    // Reminders: create + update
    const reminderTitle = `Smoke Reminder ${Date.now()}`;
    const reminderCreate = await page.request.post('/api/reminders', {
      data: {
        space_id: spaceId,
        title: reminderTitle,
        due_date: new Date().toISOString(),
      },
      headers: authHeaders,
    });
    expect(reminderCreate.ok()).toBeTruthy();
    const reminderData = await reminderCreate.json();
    const reminderId = reminderData.data?.id as string;
    const reminderUpdate = await page.request.patch(`/api/reminders/${reminderId}`, {
      data: { title: `${reminderTitle} Updated` },
      headers: authHeaders,
    });
    expect(reminderUpdate.ok()).toBeTruthy();

    await page.goto('/reminders');
    await expect(page.locator(`text=${reminderTitle} Updated`).first()).toBeVisible();

    // Meals: create + update
    const mealName = `Smoke Meal ${Date.now()}`;
    const mealCreate = await page.request.post('/api/meals', {
      data: {
        space_id: spaceId,
        meal_type: 'dinner',
        scheduled_date: new Date().toISOString().split('T')[0],
        recipe_name: mealName,
      },
      headers: authHeaders,
    });
    expect(mealCreate.ok()).toBeTruthy();
    const mealData = await mealCreate.json();
    const mealId = mealData.data?.id as string;
    const mealUpdate = await page.request.patch(`/api/meals/${mealId}`, {
      data: {
        space_id: spaceId,
        notes: 'Updated by smoke test',
      },
      headers: authHeaders,
    });
    expect(mealUpdate.ok()).toBeTruthy();

    await page.goto('/meals');
    await expect(page.locator(`text=${mealName}`).first()).toBeVisible();

    // Shopping list: create + share toggle
    const listTitle = `Smoke List ${Date.now()}`;
    const listCreate = await page.request.post('/api/shopping', {
      data: {
        space_id: spaceId,
        title: listTitle,
      },
      headers: authHeaders,
    });
    expect(listCreate.ok()).toBeTruthy();
    const listData = await listCreate.json();
    const listId = listData.data?.id as string;

    const listShareToggle = await page.request.patch(`/api/shopping/${listId}`, {
      data: { is_public: true },
      headers: authHeaders,
    });
    expect(listShareToggle.ok()).toBeTruthy();
    const updatedList = await listShareToggle.json();
    const shareToken = updatedList.data?.share_token as string | undefined;
    if (shareToken) {
      await page.goto(`/shopping/share/${shareToken}`);
      await expect(page.locator(`text=${listTitle}`).first()).toBeVisible();
    }

    await page.goto('/shopping');
    await expect(page.locator(`text=${listTitle}`).first()).toBeVisible();

    // Bulk delete + archive
    const bulkDeleteCount = await page.request.get(
      `/api/bulk/delete-expenses?space_id=${spaceId}&start_date=2000-01-01&end_date=2000-01-02`
    );
    expect(bulkDeleteCount.ok()).toBeTruthy();

    const bulkDelete = await page.request.post('/api/bulk/delete-expenses', {
      data: {
        space_id: spaceId,
        options: {
          startDate: '2000-01-01',
          endDate: '2000-01-02',
        },
      },
      headers: authHeaders,
    });
    expect(bulkDelete.ok()).toBeTruthy();

    const bulkArchive = await page.request.post('/api/bulk/archive-old-data', {
      data: {
        space_id: spaceId,
        data_type: 'tasks',
        older_than_date: '2000-01-01',
      },
      headers: authHeaders,
    });
    expect(bulkArchive.ok()).toBeTruthy();

    // Data export: JSON/CSV/PDF
    const jsonExport = await page.request.get('/api/user/export-data');
    expect(jsonExport.ok()).toBeTruthy();
    expect(jsonExport.headers()['content-type']).toContain('application/json');

    const csvExport = await page.request.get('/api/user/export-data-csv?type=all');
    expect(csvExport.ok()).toBeTruthy();
    expect(csvExport.headers()['content-type']).toContain('text/csv');

    const pdfExport = await page.request.get('/api/user/export-data-pdf?type=all');
    expect(pdfExport.ok()).toBeTruthy();
    expect(pdfExport.headers()['content-type']).toContain('application/pdf');

    // Admin notification export
    const adminLogin = await page.request.post('/api/admin/auth/login', {
      data: {
        email: SMOKE_USER.email,
        password: SMOKE_USER.password,
      },
    });
    expect(adminLogin.ok()).toBeTruthy();

    const adminExport = await page.request.post('/api/admin/notifications/export', {
      data: { includeAll: true, format: 'csv' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(adminExport.ok()).toBeTruthy();
    expect(adminExport.headers()['content-type']).toContain('text/csv');
  });
});
