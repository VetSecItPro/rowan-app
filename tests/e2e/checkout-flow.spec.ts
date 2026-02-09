/**
 * Full Checkout Flow Test
 * Tests the complete authenticated checkout flow with Polar
 */

import { test, expect } from '@playwright/test';
import { resilientClick } from './helpers/resilient-selectors';

test.describe('Authenticated Checkout Flow', () => {
  // Use pre-authenticated smoke user session
  test.use({ storageState: 'tests/e2e/.auth/smoke.json' });

  test('should redirect to Polar checkout when clicking Pro plan', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // Click upgrade button for Pro tier using resilient selector
    await resilientClick(page, 'upgrade-pro-button', {
      role: 'button',
      text: /Get Pro|Choose Pro|Start Pro/i,
    });

    // Should redirect to Polar Checkout
    await expect(
      page.locator('text=/checkout|payment|polar/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
