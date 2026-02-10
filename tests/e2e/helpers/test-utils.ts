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
  },
  pro: {
    email: 'test-pro@rowan-test.app',
    password: testPassword,
    tier: 'pro' as const,
  },
};

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
  await page.goto(route, { waitUntil: 'domcontentloaded' });

  // Dismiss cookie banner FIRST — it blocks clicks and visibility on mobile viewports
  await dismissCookieBanner(page);

  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may not fire if server is slow — proceed anyway
  });

  // Wait for subscription context to finish loading.
  // Strategy: poll for the feature-locked-message or actual feature content.
  // The loading skeleton (.animate-pulse) may flash too quickly to catch,
  // so we wait for the final state directly with generous timeout.
  try {
    await Promise.race([
      // Option 1: Locked message appears (free user blocked)
      page.waitForSelector('[data-testid="feature-locked-message"]', { state: 'visible', timeout: 25000 }),
      // Option 2: Upgrade modal appears (free user blocked, different UX)
      page.waitForSelector('[data-testid="upgrade-modal"]', { state: 'visible', timeout: 25000 }),
      // Option 3: Feature content loaded (pro user, no gate). Wait for h1 heading
      // which appears in all feature pages after subscription context resolves.
      page.waitForSelector('h1', { state: 'visible', timeout: 25000 }),
    ]);
  } catch {
    // None appeared within timeout — proceed with checks anyway
  }
  // Extra safety wait for React re-render after subscription context update
  await page.waitForTimeout(3000);

  // Check for feature locked using resilient selector
  // Match all tier variations: "Requires Pro Plan", "Requires Family Plan",
  // "Upgrade to Pro to unlock...", etc.
  const isLocked = await elementExists(page, 'feature-locked-message', {
    text: /upgrade to .+ to unlock|requires .+ plan/i,
  });

  // Also check for upgrade modal which may appear instead
  const hasUpgradeModal = await elementExists(page, 'upgrade-modal', {
    role: 'dialog',
  });

  if (shouldHaveAccess) {
    expect(isLocked).toBeFalsy();
    expect(hasUpgradeModal).toBeFalsy();
  } else {
    // Feature should be locked OR upgrade modal should appear
    expect(isLocked || hasUpgradeModal).toBeTruthy();
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
