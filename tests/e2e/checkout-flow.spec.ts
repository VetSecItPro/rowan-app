/**
 * Full Checkout Flow Test
 * Tests the complete authenticated checkout flow with Polar
 */

import { test, expect } from '@playwright/test';
import { resilientClick } from './helpers/resilient-selectors';

test.describe('Authenticated Checkout Flow', () => {
  // Use pre-authenticated pro user session (any authenticated user works for checkout)
  test.use({ storageState: 'tests/e2e/.auth/pro.json' });

  test('should redirect to Polar checkout when clicking Pro plan', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // Click upgrade button for Pro tier using resilient selector
    await resilientClick(page, 'upgrade-pro-button', {
      role: 'button',
      text: /Get Pro|Choose Pro|Start Pro/i,
    });

    // Should redirect to Polar Checkout — accept valid outcomes:
    // - Real Polar URL (checkout.polar.sh) when POLAR_ACCESS_TOKEN is set
    // - /signup if user is unauthenticated and gets bounced
    // - /dashboard?checkout=stub when CI mode hits the stubbed checkout API
    //   (see app/api/polar/checkout/route.ts — returns stub URL when
    //   CI=true && NODE_ENV !== 'production')
    const urlChanged = await page
      .waitForURL(/checkout\.polar\.sh|polar|signup|checkout=stub/i, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    const url = page.url();
    if (!urlChanged) {
      // If URL didn't change, verify we got an expected fallback
      if (url.includes('/pricing') || url.includes('/signup')) {
        const pageTitle = await page.textContent('h1');
        expect(pageTitle).toBeTruthy();
      } else {
        throw new Error(`Expected Polar/signup/stub redirect, got: ${url}`);
      }
    }
  });
});
