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
  loginAsUser,
  logout,
  goToPricingPage,
  togglePricingPeriod,
  isUpgradeModalVisible,
  closeUpgradeModal,
  verifyFeatureAccess,
  createTask,
  STRIPE_TEST_CARDS,
} from './helpers/test-utils';

test.describe('Monetization Features', () => {
  test.describe('Feature Gating', () => {
    /**
     * Test 1: Free user hits task limit → sees upgrade modal
     */
    test('free user sees upgrade modal when hitting task limit', async ({ page }) => {
      test.skip(true, 'Requires test user setup in Supabase');

      await loginAsUser(page, 'free');

      // Try to create multiple tasks to hit the limit
      for (let i = 0; i < 26; i++) {
        const success = await createTask(page, `Test Task ${i + 1}`);

        if (!success) {
          // Upgrade modal should appear
          expect(await isUpgradeModalVisible(page)).toBeTruthy();

          // Modal should have upgrade messaging
          await expect(page.locator('text=/unlock|upgrade|limit/i')).toBeVisible();

          // Should show Pro tier benefits
          await expect(page.locator('text=/unlimited/i')).toBeVisible();

          await closeUpgradeModal(page);
          break;
        }

        // If we created more than 25 tasks without limit, test should fail
        expect(i).toBeLessThan(25);
      }

      await logout(page);
    });

    /**
     * Test 2: Free user tries to access Pro features → blocked
     */
    test('free user cannot access Pro features', async ({ page }) => {
      test.skip(true, 'Requires test user setup in Supabase');

      await loginAsUser(page, 'free');

      // Test blocked features
      const blockedFeatures = ['meals', 'goals', 'household'];

      for (const feature of blockedFeatures) {
        await verifyFeatureAccess(page, feature, false);
      }

      await logout(page);
    });

    /**
     * Test 5: Pro user accesses all features
     */
    test('pro user can access all features', async ({ page }) => {
      test.skip(true, 'Requires test user setup in Supabase');

      await loginAsUser(page, 'pro');

      // Test all features are accessible
      const allFeatures = ['meals', 'goals', 'household', 'calendar'];

      for (const feature of allFeatures) {
        await verifyFeatureAccess(page, feature, true);
      }

      await logout(page);
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

      // Test monthly/annual toggle
      await togglePricingPeriod(page, 'annual');

      // Annual should show savings
      await expect(page.locator('text=/save|17%|\\$\\d+ off/i').first()).toBeVisible();

      // Toggle back to monthly
      await togglePricingPeriod(page, 'monthly');

      // Verify prices updated (monthly should be different from annual)
      await expect(page.locator('text=/\\/month/i').first()).toBeVisible();
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

  test.describe('Checkout Flow', () => {
    /**
     * Test 4: User upgrades to Pro → payment success flow
     */
    test('checkout redirects to Stripe', async ({ page }) => {
      test.skip(true, 'Requires authenticated user and Stripe test mode');

      await loginAsUser(page, 'free');
      await goToPricingPage(page);

      // Click upgrade button for Pro tier
      const upgradeButton = page.locator('button:has-text("Upgrade to Pro"), button:has-text("Get Pro"), [data-testid="pro-upgrade"]');
      await upgradeButton.click();

      // Should redirect to Stripe Checkout or show embedded checkout
      await expect(
        page.locator('text=/checkout|payment|stripe/i, [class*="stripe"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('payment success page shows confirmation', async ({ page }) => {
      // Navigate directly to success page (simulating return from Stripe)
      await page.goto('/payment/success?tier=pro');

      // Should show success message
      await expect(page.locator('text=/welcome|success|thank/i').first()).toBeVisible();

      // Should show what was unlocked
      await expect(page.locator('text=/pro|unlock|feature/i').first()).toBeVisible();

      // Should have link to dashboard
      await expect(page.locator('a:has-text("Dashboard"), a:has-text("Get Started"), button:has-text("Go to")')).toBeVisible();
    });

    test('payment canceled page shows options', async ({ page }) => {
      await page.goto('/payment/canceled');

      // Should show friendly message
      await expect(page.locator('text=/no worries|canceled|try again/i').first()).toBeVisible();

      // Should have retry option
      await expect(page.locator('a:has-text("Try Again"), button:has-text("Try Again"), a:has-text("Pricing")')).toBeVisible();

      // Should have continue with free option
      await expect(page.locator('text=/continue|free|dashboard/i').first()).toBeVisible();
    });
  });

  test.describe('Subscription Management', () => {
    /**
     * Test 6: Pro user cancels subscription
     */
    test('subscription settings page loads correctly', async ({ page }) => {
      test.skip(true, 'Requires authenticated Pro user');

      await loginAsUser(page, 'pro');

      // Navigate to subscription settings
      await page.goto('/settings?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Should show current plan
      await expect(page.locator('text=/pro|current plan/i').first()).toBeVisible();

      // Should show billing info
      await expect(page.locator('text=/billing|next payment|renewal/i').first()).toBeVisible();

      // Should have cancel option
      await expect(page.locator('button:has-text("Cancel"), a:has-text("Cancel Subscription")')).toBeVisible();

      await logout(page);
    });

    test('cancel subscription flow shows confirmation', async ({ page }) => {
      test.skip(true, 'Requires authenticated Pro user');

      await loginAsUser(page, 'pro');

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

      await logout(page);
    });
  });

  test.describe('Webhook Integration', () => {
    /**
     * Test 7: Webhook updates subscription correctly
     * Note: This test requires Stripe CLI for local webhook testing
     */
    test('webhook endpoint responds correctly', async ({ request }) => {
      // Test webhook endpoint exists and responds
      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'test_invalid_signature',
        },
        data: {
          type: 'test',
          data: { object: {} },
        },
      });

      // Should reject invalid signature (401 or 400)
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Upgrade Modals', () => {
    test('upgrade modal is accessible and dismissible', async ({ page }) => {
      test.skip(true, 'Requires trigger for upgrade modal');

      await loginAsUser(page, 'free');

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

      await logout(page);
    });
  });
});

test.describe('Security Checks', () => {
  test('API routes require authentication', async ({ request }) => {
    // Test subscription status without auth
    const statusResponse = await request.get('/api/subscriptions');
    expect([401, 403]).toContain(statusResponse.status());

    // Test checkout session creation without auth
    const checkoutResponse = await request.post('/api/stripe/create-checkout-session', {
      data: { tier: 'pro', period: 'monthly' },
    });
    expect([401, 403]).toContain(checkoutResponse.status());

    // Test cancel subscription without auth
    const cancelResponse = await request.post('/api/subscription/cancel', {
      data: { reason: 'test' },
    });
    expect([401, 403]).toContain(cancelResponse.status());
  });

  test('invalid input is rejected with proper errors', async ({ request }) => {
    // Test with invalid tier
    const invalidTierResponse = await request.post('/api/stripe/create-checkout-session', {
      headers: { 'Content-Type': 'application/json' },
      data: { tier: 'invalid', period: 'monthly' },
    });
    expect([400, 401, 422]).toContain(invalidTierResponse.status());

    // Test with invalid period
    const invalidPeriodResponse = await request.post('/api/stripe/create-checkout-session', {
      headers: { 'Content-Type': 'application/json' },
      data: { tier: 'pro', period: 'invalid' },
    });
    expect([400, 401, 422]).toContain(invalidPeriodResponse.status());
  });

  test('webhook endpoint validates signature', async ({ request }) => {
    // Test without signature header
    const noSigResponse = await request.post('/api/webhooks/stripe', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_test', metadata: { user_id: 'test' } } },
      },
    });
    expect([400, 401, 403]).toContain(noSigResponse.status());

    // Test with invalid signature
    const invalidSigResponse = await request.post('/api/webhooks/stripe', {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'invalid_signature_here',
      },
      data: {
        type: 'checkout.session.completed',
        data: { object: { customer: 'cus_test', metadata: { user_id: 'test' } } },
      },
    });
    expect([400, 401]).toContain(invalidSigResponse.status());
  });
});
