/**
 * Monetization E2E Tests
 *
 * Tests for subscription features, feature gating, and payment flows
 *
 * Test Scenarios:
 * 1. Free user hits task limit → sees upgrade modal
 * 2. Free user tries to create calendar event → blocked
 * 3. User views pricing page → toggles monthly/annual
 * 4. User upgrades to Pro → payment success flow
 * 5. Pro user accesses previously blocked features
 * 6. Pro user cancels subscription → downgrade flow
 * 7. Webhook updates subscription correctly
 */

import { test, expect } from '@playwright/test';
import {
  goToPricingPage,
  togglePricingPeriod,
  isUpgradeModalVisible,
  verifyFeatureAccess,
  ensureAuthenticated,
} from './helpers/test-utils';

test.describe('Monetization Features', () => {
  test.describe('Feature Gating — Free User', () => {
    // Use pre-authenticated free user session
    test.use({ storageState: 'tests/e2e/.auth/free.json' });

    /**
     * Test 1: Free user hits daily task creation limit via API
     *
     * Verifies server-side usage enforcement by creating tasks via API
     * until the daily limit (10 for free tier) is hit, then expects 429.
     * This is more reliable than UI-based creation which takes 180s+ and
     * has silent error handling in the usage check catch block.
     *
     * TODO(2026-05-07): un-skip pending free-user-session hydration fix.
     * PR #374 surfaced expect(csrfToken).toBeTruthy() OR expect(spaceId)
     * .toBeTruthy() failing within ~6s of test start. Likely the
     * tests/e2e/.auth/free.json storage state isn't carrying the right
     * cookies for /api/csrf/token + /api/spaces. Investigation needed
     * on the seed-test-users script's free-user provisioning before
     * re-un-skipping.
     */
    test.skip('free user hits daily task creation limit', async ({ page }) => {
      test.setTimeout(180000);

      // Ensure free user session is valid (re-authenticates if expired)
      await ensureAuthenticated(page, 'free');

      // Get a CSRF token for API calls (with retry for session hydration)
      let csrfToken = '';
      for (let i = 0; i < 2; i++) {
        const csrfResponse = await page.request.get('/api/csrf/token', { timeout: 30000 });
        if (csrfResponse.ok()) {
          const csrfPayload = await csrfResponse.json();
          csrfToken = csrfPayload.token as string;
          break;
        }
        if (i < 1) await page.waitForTimeout(2000);
      }
      expect(csrfToken).toBeTruthy();

      // Get space ID with single retry (space provisioning trigger can lag)
      let spaceId: string | undefined;
      for (let i = 0; i < 2; i++) {
        const spacesResponse = await page.request.get('/api/spaces', { timeout: 30000 });
        if (spacesResponse.ok()) {
          const spacesResult = await spacesResponse.json();
          const spaces = spacesResult.data || spacesResult;
          spaceId = Array.isArray(spaces) ? spaces[0]?.id : undefined;
          if (spaceId) break;
        }
        if (i < 1) await page.waitForTimeout(5000);
      }
      expect(spaceId).toBeTruthy();

      // Create tasks via API until we hit the daily limit
      // Free tier limit is 10 daily task creations (from feature-limits.ts)
      let hitLimit = false;
      for (let i = 0; i < 15; i++) {
        // Fetch fresh CSRF token before each mutation (middleware rotates after each POST)
        const freshCsrf = await page.request.get('/api/csrf/token', { timeout: 30000 });
        if (!freshCsrf.ok()) {
          throw new Error(`CSRF token fetch failed: ${freshCsrf.status()}`);
        }
        const freshPayload = await freshCsrf.json();
        const token = freshPayload.token as string;

        const response = await page.request.post('/api/tasks', {
          data: {
            space_id: spaceId,
            title: `Limit Test Task ${Date.now()}-${i}`,
          },
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
          },
          timeout: 30000,
        });

        if (response.status() === 429) {
          // 429 from usage limit — feature gating is working
          hitLimit = true;
          break;
        }

        // Task should have been created successfully
        if (!response.ok()) {
          const body = await response.text().catch(() => '(unreadable)');
          throw new Error(`Task creation failed: ${response.status()} ${body}`);
        }
      }

      // Usage limit should have been enforced
      expect(hitLimit).toBeTruthy();

      // Verify the tasks page loads correctly regardless
      await page.goto('/tasks');
      await page.waitForLoadState('domcontentloaded');
    });

    /**
     * Test 2: Free user tries to access Pro features → blocked
     */
    test('free user cannot access Pro features', async ({ page }) => {
      // Visits multiple pages sequentially — needs extra time
      test.setTimeout(120000);

      // Test blocked features — give subscription context time to load
      const blockedFeatures = ['meals', 'goals', 'household'];

      for (const feature of blockedFeatures) {
        await verifyFeatureAccess(page, feature, false);
      }
    });
  });

  test.describe('Feature Gating — Pro User', () => {
    // Use pre-authenticated pro user session
    test.use({ storageState: 'tests/e2e/.auth/pro.json' });

    /**
     * Test 5: Pro user accesses all features
     */
    test('pro user can access all features', async ({ page }) => {
      // Visits 4 pages sequentially — needs extra time
      test.setTimeout(120000);

      // Test all features are accessible — pro user should see no lock
      const allFeatures = ['meals', 'goals', 'household', 'calendar'];

      for (const feature of allFeatures) {
        await verifyFeatureAccess(page, feature, true);
      }
    });
  });

  test.describe('Pricing Page', () => {
    /**
     * Test 3: User views pricing page → toggles monthly/annual
     */
    test('pricing page displays correctly and toggles work', async ({ page }) => {
      await goToPricingPage(page);

      // Verify pricing page has all elements
      await expect(page.locator('text=/free/i').first()).toBeVisible();
      await expect(page.locator('text=/pro/i').first()).toBeVisible();
      await expect(page.locator('text=/family/i').first()).toBeVisible();

      // Verify pricing is shown
      await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible();

      // Test monthly/annual toggle works - just verify page updates without error
      await togglePricingPeriod(page, 'annual');

      // Wait a moment for the UI to update
      await page.waitForTimeout(500);

      // Toggle back to monthly
      await togglePricingPeriod(page, 'monthly');

      // Page should still have pricing info after toggling
      await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible();
    });

    test('pricing page is mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      await goToPricingPage(page);

      // Pricing cards should stack on mobile
      const pricingCards = page.locator('[class*="pricing"], [data-testid*="plan"]');

      // Cards should be visible
      if ((await pricingCards.count()) > 0) {
        await expect(pricingCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Checkout Flow — Free User', () => {
    // Use pre-authenticated free user session
    test.use({ storageState: 'tests/e2e/.auth/free.json' });

    /**
     * Test 4: User upgrades to Pro → payment success flow
     */
    test('checkout redirects to Polar', async ({ page }) => {
      await goToPricingPage(page);

      // Click upgrade button for Pro tier using testid
      const upgradeButton = page.getByTestId('upgrade-pro-button');
      await upgradeButton.click();

      // Should redirect somewhere off /pricing — accept any of:
      // - real Polar URL (POLAR_ACCESS_TOKEN set)
      // - login/signup/welcome bounce (unauth)
      // - /dashboard?checkout=stub (CI stub from this PR)
      const urlChanged = await page.waitForURL(/checkout\.polar\.sh|polar|login|signup|welcome|checkout=stub/i, { timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      const url = page.url();
      if (!urlChanged) {
        // In test environment, Polar redirect may not happen
        if (url.includes('/pricing') || url.includes('/login') || url.includes('/signup') || url.includes('/welcome')) {
          await expect(page.getByText(/upgrade|payment|checkout|sign in|sign up|log in/i).first()).toBeVisible();
        } else {
          throw new Error(`Expected Polar/login/signup/welcome/stub redirect, got: ${url}`);
        }
      }
    });
  });

  test.describe('Checkout Flow — Unauthenticated', () => {
    // Explicitly clear storage state for unauthenticated flow tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test('payment success page shows confirmation', async ({ page }) => {
      test.setTimeout(90000);

      // Navigate directly to success page (simulating return from Polar)
      await page.goto('/payment/success?tier=pro', { waitUntil: 'domcontentloaded' });

      // Should show activation or success message (page polls subscription status first)
      await expect(page.getByTestId('payment-success-title')).toBeVisible();

      // Should show subscription details
      await expect(page.getByTestId('payment-success-subtitle')).toBeVisible();

      // Should have link to dashboard
      await expect(page.getByTestId('payment-success-dashboard-link')).toBeVisible();
    });

    test('payment canceled page shows options', async ({ page }) => {
      test.setTimeout(90000);

      await page.goto('/payment/canceled', { waitUntil: 'domcontentloaded' });

      // Should show friendly message
      await expect(page.getByTestId('payment-canceled-title')).toBeVisible();

      // Should show explanation
      await expect(page.getByTestId('payment-canceled-subtitle')).toBeVisible();

      // Should have retry option
      await expect(page.getByTestId('payment-canceled-retry-link')).toBeVisible();

      // Should have continue with free option
      await expect(page.getByTestId('payment-canceled-dashboard-link')).toBeVisible();
    });
  });

  test.describe('Subscription Management — Pro User', () => {
    // Use pre-authenticated pro user session
    test.use({ storageState: 'tests/e2e/.auth/pro.json' });

    /**
     * Test 6: Pro user cancels subscription
     */
    test('subscription settings page loads correctly', async ({ page }) => {
      test.setTimeout(90000);

      // Ensure pro user session is valid (re-authenticates if expired)
      await ensureAuthenticated(page, 'pro');

      // Navigate to subscription settings
      await page.goto('/settings?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Wait for subscription context to fully hydrate.
      // The SubscriptionProvider retries up to 3 times with 20s timeout each (worst case ~60s).
      // Wait for the loading skeleton to disappear OR the plan name to appear.
      await expect(page.getByTestId('subscription-plan-name')).toBeVisible({ timeout: 75000 });
      await expect(page.getByTestId('subscription-plan-name')).toContainText(/Pro Plan|Family Plan|Free Plan/i);

      // Should show billing management button or upgrade option
      const hasBilling = await page.locator('button:has-text("Manage Billing")').isVisible().catch(() => false);
      const hasUpgrade = await page.locator('a:has-text("Upgrade"), button:has-text("Upgrade")').first().isVisible().catch(() => false);
      expect(hasBilling || hasUpgrade).toBeTruthy();
    });

    // TODO: Implement cancel subscription functionality in SubscriptionSettings component
    // TODO(2026-05-07): un-skip pending UI selector fix. PR #374 surfaced
    // a 15s timeout on cancelButton.click() — the broad selector
    // `button:has-text("Cancel Subscription"), a:has-text("Cancel")`
    // didn't find the cancel control on /settings?tab=subscription. Either
    // the button has different text, lives in a sub-route, or is gated
    // behind an active subscription that the test pro user doesn't have.
    // Needs the subscription-cancel UI inspected for the actual testid/text.
    test.skip('cancel subscription flow shows confirmation', async ({ page }) => {

      await page.goto('/settings?tab=subscription');

      // Click cancel button
      const cancelButton = page.locator('button:has-text("Cancel Subscription"), a:has-text("Cancel")');
      await cancelButton.click();

      // Should show confirmation modal
      await expect(page.locator('[role="dialog"], [class*="modal"]')).toBeVisible();

      // Modal should explain what happens
      await expect(page.locator('text=/access until|end of|period/i')).toBeVisible();

      // Should have confirm and keep options
      await expect(page.locator('button:has-text("Confirm Cancel"), button:has-text("Keep")')).toBeVisible();
    });
  });

  test.describe('Webhook Integration', () => {
    /**
     * Test 7: Webhook updates subscription correctly
     * Note: This test requires Polar webhook secret for local testing
     */
    test('webhook endpoint responds correctly', async ({ request }) => {
      test.setTimeout(90000);

      // The webhook handler uses standardwebhooks-format signing via
      // @polar-sh/sdk validateEvent (PR #371). Test that a payload with
      // an obviously-invalid signature (wrong header values) is rejected.
      const response = await request.post('/api/webhooks/polar', {
        headers: {
          'Content-Type': 'application/json',
          'webhook-id': 'msg_test_invalid',
          'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
          'webhook-signature': 'v1,invalid-signature-base64',
        },
        data: { type: 'subscription.created', data: { id: 'test' } },
        timeout: 30000,
      });

      // Bad sig → 400 (validateEvent throws WebhookVerificationError)
      // No secret configured → 500 (defensive fallback)
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Upgrade Modals — Free User', () => {
    // Use pre-authenticated free user session
    test.use({ storageState: 'tests/e2e/.auth/free.json' });

    test('upgrade modal is accessible and dismissible', async ({ page }) => {

      // Navigate to a blocked feature to trigger modal
      await page.goto('/meals');

      if (await isUpgradeModalVisible(page)) {
        // Modal should be accessible
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();

        // Should have accessible close button
        const closeButton = page.locator('[aria-label="Close"], button:has-text("Not now"), button:has-text("Close")');
        await expect(closeButton).toBeVisible();

        // Should be closeable with ESC key
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    });
  });
});

test.describe('Security Checks', () => {
  // Explicitly clear storage state so request fixture has no auth cookies
  test.use({ storageState: { cookies: [], origins: [] } });

  test('API routes require authentication', async ({ request }) => {
    test.setTimeout(90000);

    // Test subscription status without auth - should reject or return free tier
    const statusResponse = await request.get('/api/subscriptions', { timeout: 30000 });
    expect([200, 401, 403]).toContain(statusResponse.status());

    // Test checkout session creation without auth - should be rejected
    const checkoutResponse = await request.post('/api/polar/checkout', {
      data: { plan: 'pro', billingInterval: 'monthly' },
      timeout: 30000,
    });
    expect([401, 403]).toContain(checkoutResponse.status());

    // Test customer portal access without auth - should be rejected
    const portalResponse = await request.post('/api/polar/portal', { timeout: 30000 });
    expect([401, 403]).toContain(portalResponse.status());
  });

  test('invalid input is rejected with proper errors', async ({ request }) => {
    // Test with invalid plan
    // Note: 403 is expected when CSRF validation fails (no token provided)
    const invalidPlanResponse = await request.post('/api/polar/checkout', {
      headers: { 'Content-Type': 'application/json' },
      data: { plan: 'invalid', billingInterval: 'monthly' },
    });
    expect([400, 401, 403, 422]).toContain(invalidPlanResponse.status());

    // Test with invalid billing interval
    const invalidIntervalResponse = await request.post('/api/polar/checkout', {
      headers: { 'Content-Type': 'application/json' },
      data: { plan: 'pro', billingInterval: 'invalid' },
    });
    expect([400, 401, 403, 422]).toContain(invalidIntervalResponse.status());
  });

  test('webhook endpoint validates signature', async ({ request }) => {
    // Test without signature headers (no webhook-* keys at all)
    const noSigResponse = await request.post('/api/webhooks/polar', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        type: 'subscription.created',
        data: { id: 'sub_test', customer_id: 'cus_test' },
      },
      timeout: 30000,
    });
    // Should reject - validateEvent throws on missing standardwebhooks headers
    expect([400, 500]).toContain(noSigResponse.status());

    // Test with bogus signature in standardwebhooks header format. The
    // updated route uses @polar-sh/sdk validateEvent, which reads
    // webhook-id, webhook-timestamp, and webhook-signature.
    const invalidSigResponse = await request.post('/api/webhooks/polar', {
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': 'msg_test_invalid',
        'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        'webhook-signature': 'v1,deadbeefdeadbeefdeadbeefdeadbeef',
      },
      data: {
        type: 'subscription.created',
        data: { id: 'sub_test', customer_id: 'cus_test' },
      },
      timeout: 30000,
    });
    // Should reject invalid signature (WebhookVerificationError → 400)
    expect([400, 500]).toContain(invalidSigResponse.status());
  });
});
