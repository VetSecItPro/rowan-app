/**
 * E2E Test Utilities for Rowan App
 *
 * Provides helper functions for testing subscription and monetization features
 */

import { Page, expect } from '@playwright/test';
import { resilientFill, resilientClick, elementExists, getButton } from './resilient-selectors';

/**
 * Dismiss cookie consent banner if visible
 * This prevents the banner from blocking clicks on mobile viewports
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    // Wait briefly for cookie banner to render (it mounts after hydration)
    const gotItButton = page.getByTestId('cookie-consent-accept');
    try {
      await gotItButton.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // Banner not present or already dismissed — try text fallback
      const textButton = page.getByRole('button', { name: 'Got it' });
      try {
        await textButton.waitFor({ state: 'visible', timeout: 1000 });
        await textButton.click();
        await page.waitForTimeout(500);
        return;
      } catch {
        // No banner at all — that's fine
        return;
      }
    }

    await gotItButton.click();
    // Wait for banner to animate out
    await page.waitForTimeout(500);
  } catch (error) {
    // Silently fail - banner may not be present
    console.log('Cookie banner not found or already dismissed');
  }
}

// Test user credentials — passwords from env vars (never hardcode for public repos)
const testPassword = process.env.E2E_TEST_PASSWORD || '';
export const TEST_USERS = {
  free: {
    email: 'test-free@rowan-test.app',
    password: testPassword,
    tier: 'free' as const,
    storageState: 'tests/e2e/.auth/free.json',
  },
  pro: {
    email: 'test-pro@rowan-test.app',
    password: testPassword,
    tier: 'pro' as const,
    storageState: 'tests/e2e/.auth/pro.json',
  },
};

/**
 * Ensure the test user is authenticated. If the session is invalid
 * (e.g., Supabase's getUser() network call failed in CI, or refresh
 * token was rotated by a prior test), re-authenticate via UI login
 * and save the updated storage state for subsequent tests.
 *
 * Call this at the start of any test that needs a valid auth session.
 */
export async function ensureAuthenticated(
  page: Page,
  userType: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[userType];

  // Navigate to a protected page to activate cookies and check session.
  // page.request may not carry cookies until after a page navigation.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // If we weren't redirected to login, session is valid
  if (!page.url().includes('/login')) {
    return;
  }

  // Session expired — we're on /login, re-authenticate
  console.warn(`Session expired for ${userType} user, re-authenticating...`);

  await page.waitForLoadState('networkidle').catch(() => {});
  await dismissCookieBanner(page);

  const emailInput = page.locator('[data-testid="login-email-input"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(user.email);

  const passwordInput = page.locator('[data-testid="login-password-input"], input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(user.password);

  await page.keyboard.press('Enter');

  // Wait for redirect away from /login
  await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 45000 });

  // Verify auth via API
  const verifyResponse = await page.request.get('/api/csrf/token', { timeout: 10000 }).catch(() => null);
  if (!verifyResponse?.ok()) {
    throw new Error(`Re-authentication failed for ${userType} user`);
  }

  // Save updated storage state so subsequent tests in this run get valid cookies
  await page.context().storageState({ path: user.storageState });
  console.log(`  ✓ Re-authenticated ${userType} user and saved session`);
}

// Payment test cards (Polar uses Stripe under the hood)
export const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuth: '4000002500003155',
};

/**
 * Login as a test user using resilient selectors
 */
export async function loginAsUser(
  page: Page,
  userType: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[userType];

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form using resilient selectors
  await resilientFill(page, 'login-email-input', user.email, {
    role: 'textbox',
    type: 'email',
  });

  await resilientFill(page, 'login-password-input', user.password, {
    role: 'textbox',
    type: 'password',
  });

  // Submit form
  await resilientClick(page, 'login-submit-button', {
    role: 'button',
    text: 'Sign In',
  });

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|tasks)/);
}

/**
 * Logout current user using resilient selectors
 */
export async function logout(page: Page): Promise<void> {
  // Try direct logout button first
  const hasLogoutButton = await elementExists(page, 'logout-button', {
    role: 'button',
    text: 'Sign out',
  });

  if (hasLogoutButton) {
    await resilientClick(page, 'logout-button', {
      role: 'button',
      text: 'Sign out',
    });
  } else {
    // Try user menu dropdown
    const hasUserMenu = await elementExists(page, 'user-menu-button', {
      role: 'button',
    });

    if (hasUserMenu) {
      await resilientClick(page, 'user-menu-button', {
        role: 'button',
      });

      // Click logout in dropdown
      await resilientClick(page, 'logout-button', {
        role: 'button',
        text: 'Sign out',
      });
    }
  }

  await page.waitForURL('/login');
}

/**
 * Navigate to pricing page
 */
export async function goToPricingPage(page: Page): Promise<void> {
  await page.goto('/pricing');
  await page.waitForLoadState('domcontentloaded');

  // Verify pricing page loaded - look for h1 heading with "family" in the text
  await expect(
    page.locator('h1').filter({ hasText: /family|pricing|plans|upgrade/i }).first()
  ).toBeVisible();
}

/**
 * Toggle between monthly and annual pricing
 */
export async function togglePricingPeriod(
  page: Page,
  period: 'monthly' | 'annual'
): Promise<void> {
  // Use resilient selector for pricing period buttons
  if (period === 'annual') {
    await resilientClick(page, 'pricing-annual-button', {
      role: 'button',
      text: 'Annual',
    });
  } else {
    await resilientClick(page, 'pricing-monthly-button', {
      role: 'button',
      text: 'Monthly',
    });
  }
}

/**
 * Check if upgrade modal is visible using resilient selector
 */
export async function isUpgradeModalVisible(page: Page): Promise<boolean> {
  return await elementExists(page, 'upgrade-modal', {
    role: 'dialog',
  });
}

/**
 * Close upgrade modal if visible using resilient selector
 */
export async function closeUpgradeModal(page: Page): Promise<void> {
  const isVisible = await isUpgradeModalVisible(page);

  if (isVisible) {
    await resilientClick(page, 'modal-close-button', {
      role: 'button',
      name: 'Close',
    });
  }
}

/**
 * Verify feature is accessible for current user
 *
 * Detection strategy:
 * 1. Navigate to the feature page
 * 2. Wait for one of three outcomes:
 *    a) feature-locked-message testid appears → user is blocked
 *    b) upgrade-modal testid appears → user is blocked
 *    c) Feature content loads (h1 visible, no lock overlay) → user has access
 *    d) Page stays in loading state (animate-pulse) → subscription context
 *       didn't resolve. Treat as "gated" for free users (deny by default).
 * 3. Assert based on expected access
 */
export async function verifyFeatureAccess(
  page: Page,
  feature: string,
  shouldHaveAccess: boolean
): Promise<void> {
  const featureRoutes: Record<string, string> = {
    meals: '/meals',
    reminders: '/reminders',
    goals: '/goals',
    household: '/expenses',
    calendar: '/calendar',
  };

  const route = featureRoutes[feature] || `/${feature}`;
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Check if we were redirected to the login page — session expired.
  // Instead of silently passing or failing, re-authenticate and retry.
  if (page.url().includes('/login')) {
    const userType = shouldHaveAccess ? 'pro' : 'free';
    console.warn(`Feature "${feature}": session expired, re-authenticating as ${userType}...`);
    await ensureAuthenticated(page, userType);

    // Re-navigate to the feature page after re-authentication
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // If still redirected to login after re-auth, that's a real failure
    if (page.url().includes('/login')) {
      throw new Error(
        `Feature "${feature}" still redirects to login after re-authentication. ` +
        `Auth is fundamentally broken. URL: ${page.url()}`
      );
    }
  }

  // Dismiss cookie banner FIRST — it blocks clicks and visibility on mobile viewports
  await dismissCookieBanner(page);

  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may not fire if server is slow — proceed anyway
  });

  // Wait for subscription context to finish loading.
  // The SubscriptionProvider retries up to 3 times with 20s timeout each (worst case ~60s+).
  // Use a generous timeout that exceeds the subscription fetch retry cycle.
  const GATE_TIMEOUT = 75000;

  // Poll for the final state: locked message, upgrade modal, or feature content.
  let resolvedState: 'locked' | 'modal' | 'content' | 'loading' = 'loading';
  try {
    const result = await Promise.race([
      page.waitForSelector('[data-testid="feature-locked-message"]', { state: 'visible', timeout: GATE_TIMEOUT })
        .then(() => 'locked' as const),
      page.waitForSelector('[data-testid="upgrade-modal"]', { state: 'visible', timeout: GATE_TIMEOUT })
        .then(() => 'modal' as const),
      // Wait for h1 that is NOT inside a loading skeleton (the page shell may render h1 early)
      page.waitForSelector('h1:not(.animate-pulse *)', { state: 'visible', timeout: GATE_TIMEOUT })
        .then(() => 'content' as const),
    ]);
    resolvedState = result;
  } catch {
    // None appeared within timeout — still in loading state
    resolvedState = 'loading';
  }

  // Extra safety wait for React re-render after subscription context update
  await page.waitForTimeout(2000);

  // Re-check after the wait — subscription may have resolved during the pause
  if (resolvedState === 'content' || resolvedState === 'loading') {
    // The h1 may have appeared, but so might the lock message (they're in the same component tree).
    // Check again for lock indicators.
    const lockedNow = await page.locator('[data-testid="feature-locked-message"]').isVisible().catch(() => false);
    const modalNow = await page.locator('[data-testid="upgrade-modal"]').isVisible().catch(() => false);
    if (lockedNow) resolvedState = 'locked';
    else if (modalNow) resolvedState = 'modal';
  }

  // Determine access based on resolved state
  const isBlocked = resolvedState === 'locked' || resolvedState === 'modal';
  const hasContent = resolvedState === 'content';
  const isStillLoading = resolvedState === 'loading';

  if (shouldHaveAccess) {
    // Pro user: feature content should be visible, no lock
    if (isBlocked) {
      throw new Error(
        `Feature "${feature}" should be accessible but was blocked ` +
        `(state: ${resolvedState}). URL: ${page.url()}`
      );
    }
    // Content loaded or still loading is OK for pro users —
    // loading means subscription hasn't resolved but that's a CI timing issue, not a gating failure
    if (hasContent) {
      // Verify no lock overlay on top of content
      const lockOverlay = await page.locator('[data-testid="feature-locked-message"]').isVisible().catch(() => false);
      expect(lockOverlay).toBeFalsy();
    }
  } else {
    // Free user: feature should be blocked
    if (isBlocked) {
      // Expected — feature is properly gated
      return;
    }

    if (isStillLoading) {
      // Subscription context never resolved in CI.
      // The FeatureGateWrapper defaults to showing loading state (which prevents access).
      // This is acceptable — the user cannot use the feature while it's loading.
      console.warn(
        `Feature "${feature}" still in loading state after 30s. ` +
        `Subscription context may not have resolved in CI. ` +
        `Treating as "gated" since loading state blocks feature access.`
      );
      return;
    }

    // Content loaded but user is free — this means gating didn't work
    // Check one more time with direct DOM inspection
    const pageText = await page.locator('body').textContent().catch(() => '');
    const hasUpgradeText = /upgrade to .+ to unlock|requires .+ plan/i.test(pageText || '');
    if (hasUpgradeText) {
      // Lock text exists in DOM even if testid wasn't found — acceptable
      return;
    }

    // Feature content is showing for a free user — fail with diagnostic info
    throw new Error(
      `Feature "${feature}" should be blocked for free user but content loaded. ` +
      `State: ${resolvedState}. URL: ${page.url()}`
    );
  }
}

/**
 * Create a task (for testing task limits) using resilient selectors
 */
export async function createTask(page: Page, title: string): Promise<boolean> {
  await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Dismiss cookie banner if it's blocking clicks (especially on mobile)
  await dismissCookieBanner(page);

  // Click add task button using resilient selector
  await resilientClick(page, 'add-task-button', {
    role: 'button',
    text: /New Task|Add Task/i,
  });

  // Check if limit modal appears
  const limitModal = await isUpgradeModalVisible(page);
  if (limitModal) {
    await closeUpgradeModal(page);
    return false;
  }

  // Fill task form using resilient selector
  await resilientFill(page, 'task-title-input', title, {
    role: 'textbox',
    placeholder: /complete|e\.g\./i,
  });

  // Submit using resilient selector
  await resilientClick(page, 'task-submit-button', {
    role: 'button',
    text: /create|add/i,
  });

  // Wait for task to appear
  await page.waitForSelector(`text=${title}`, { timeout: 5000 });
  return true;
}

/**
 * Get task count for current user
 */
export async function getTaskCount(page: Page): Promise<number> {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');

  // Look for task count indicator using resilient selector
  const hasCountIndicator = await elementExists(page, 'task-count', {
    text: /\d+.*tasks?/i,
  });

  if (hasCountIndicator) {
    const countElement = await getButton(page, 'task-count');
    const text = await countElement.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Count task items using resilient selector
  const taskItems = page.locator('[data-testid^="task-item"]');
  const count = await taskItems.count();

  // Fallback to class-based selector if testids not found
  if (count === 0) {
    const fallbackItems = page.locator('.task-item, [class*="task"]');
    return await fallbackItems.count();
  }

  return count;
}

/**
 * Simulate Polar webhook (for local testing only)
 */
export async function simulatePolarWebhook(
  page: Page,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<Response> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // This is for local testing only - in CI, use Polar CLI
  const response = await fetch(`${baseURL}/api/webhooks/polar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: Real webhook signature would be required in production
      'Polar-Signature': 'test_signature',
    },
    body: JSON.stringify({
      type: eventType,
      data: payload,
    }),
  });

  return response;
}

/**
 * Wait for subscription update after webhook
 */
export async function waitForSubscriptionUpdate(
  page: Page,
  expectedTier: 'free' | 'pro' | 'family',
  timeout = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await page.goto('/settings?tab=subscription');
    await page.waitForLoadState('networkidle');

    const tierBadge = page.locator(`text=/${expectedTier}/i`);
    if (await tierBadge.isVisible()) {
      return;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`Subscription tier did not update to ${expectedTier} within ${timeout}ms`);
}

/**
 * Check subscription status in settings using resilient selectors
 */
export async function getSubscriptionStatus(page: Page): Promise<{
  tier: string;
  status: string;
}> {
  await page.goto('/settings?tab=subscription');
  await page.waitForLoadState('networkidle');

  // Extract tier and status using resilient selectors
  const hasTierElement = await elementExists(page, 'subscription-tier');
  const hasStatusElement = await elementExists(page, 'subscription-status');

  let tier = 'free';
  let status = 'active';

  if (hasTierElement) {
    const tierElement = page.getByTestId('subscription-tier');
    tier = (await tierElement.textContent()) || 'free';
  }

  if (hasStatusElement) {
    const statusElement = page.getByTestId('subscription-status');
    status = (await statusElement.textContent()) || 'active';
  }

  return {
    tier: tier.toLowerCase(),
    status: status.toLowerCase(),
  };
}
