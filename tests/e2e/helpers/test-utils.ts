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
    // Check if cookie banner is visible (z-index 60 fixed bottom banner)
    const bannerVisible = await elementExists(page, 'cookie-consent-accept', {
      role: 'button',
      text: 'Got it',
    });

    if (bannerVisible) {
      await resilientClick(page, 'cookie-consent-accept', {
        role: 'button',
        text: 'Got it',
      });

      // Wait for banner to animate out
      await page.waitForTimeout(500);
    }
  } catch (error) {
    // Silently fail - banner may not be present
    console.log('Cookie banner not found or already dismissed');
  }
}

// Test user credentials — passwords from env vars (never hardcode for public repos)
const testPassword = process.env.E2E_TEST_PASSWORD || '';
export const TEST_USERS = {
  smoke: {
    email: process.env.SMOKE_TEST_EMAIL || 'smoke.test@rowan-test.app',
    password: process.env.SMOKE_TEST_PASSWORD || testPassword,
    tier: 'pro' as const,
  },
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
  family: {
    email: 'test-family@rowan-test.app',
    password: testPassword,
    tier: 'family' as const,
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
  await page.goto(route);
  await page.waitForLoadState('networkidle');

  // Check for feature locked using resilient selector
  const isLocked = await elementExists(page, 'feature-locked-message', {
    text: /upgrade to unlock|requires pro/i,
  });

  if (shouldHaveAccess) {
    expect(isLocked).toBeFalsy();
  } else {
    expect(isLocked).toBeTruthy();
  }
}

/**
 * Create a task (for testing task limits) using resilient selectors
 */
export async function createTask(page: Page, title: string): Promise<boolean> {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');

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
    placeholder: /task/i,
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
