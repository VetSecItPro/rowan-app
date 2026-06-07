/**
 * Regression for BUG-1 (June 2026 QA sweep): the legacy `/expenses` page had
 * dead "Add Manual Expense" / "Add Expense" buttons (no onClick) and duplicated
 * the receipt scanner. Expense management lives in the `/budget` hub. The page
 * now redirects there; this guards that the orphan route never reappears.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Legacy /expenses route', () => {
  test('redirects to the /budget hub', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');
    await page.goto('/expenses', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Server-component redirect('/budget') — should land on the budget hub,
    // never on a standalone /expenses page.
    await expect(page).toHaveURL(/\/budget(\b|\/|$)/, { timeout: 15000 });
    expect(page.url()).not.toMatch(/\/expenses(\b|$)/);
  });
});
