/**
 * E2E Test Utilities for Rowan App
 *
 * Provides helper functions for testing subscription and monetization features
 */

import { Page, expect } from '@playwright/test';

// Test user credentials (these should be test accounts in Supabase)
export const TEST_USERS = {
  free: {
    email: 'test-free@rowan-test.app',
    password: 'TestPassword123!',
    tier: 'free' as const,
  },
  pro: {
    email: 'test-pro@rowan-test.app',
    password: 'TestPassword123!',
    tier: 'pro' as const,
  },
  family: {
    email: 'test-family@rowan-test.app',
    password: 'TestPassword123!',
    tier: 'family' as const,
  },
};

// Stripe test cards
export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuth: '4000002500003155',
};

/**
 * Login as a test user
 */
export async function loginAsUser(
  page: Page,
  userType: keyof typeof TEST_USERS
): Promise<void> {
  const user = TEST_USERS[userType];

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|tasks)/);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu or logout button
  const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Sign out"), button:has-text("Logout")');

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // Try dropdown menu
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Account")');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('button:has-text("Sign out"), button:has-text("Logout")');
    }
  }

  await page.waitForURL('/login');
}

/**
 * Navigate to pricing page
 */
export async function goToPricingPage(page: Page): Promise<void> {
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle');

  // Verify pricing page loaded
  await expect(page.locator('h1, h2').filter({ hasText: /pricing|plans|upgrade/i })).toBeVisible();
}

/**
 * Toggle between monthly and annual pricing
 */
export async function togglePricingPeriod(
  page: Page,
  period: 'monthly' | 'annual'
): Promise<void> {
  const toggle = page.locator('[data-testid="pricing-toggle"], button:has-text("Annual"), button:has-text("Monthly")');

  // Check current state and toggle if needed
  const isAnnual = await page.locator('text=/save|annual/i').isVisible();

  if ((period === 'annual' && !isAnnual) || (period === 'monthly' && isAnnual)) {
    await toggle.click();
  }
}

/**
 * Check if upgrade modal is visible
 */
export async function isUpgradeModalVisible(page: Page): Promise<boolean> {
  const modal = page.locator('[data-testid="upgrade-modal"], [role="dialog"]:has-text("Upgrade"), [role="dialog"]:has-text("unlock")');
  return await modal.isVisible();
}

/**
 * Close upgrade modal if visible
 */
export async function closeUpgradeModal(page: Page): Promise<void> {
  const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Not now"), button[aria-label="Close"]');

  if (await closeButton.isVisible()) {
    await closeButton.click();
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

  // Check for feature locked page or upgrade modal
  const isLocked = await page.locator('[data-testid="feature-locked"], text=/upgrade to unlock/i, text=/requires pro/i').isVisible();

  if (shouldHaveAccess) {
    expect(isLocked).toBeFalsy();
  } else {
    expect(isLocked).toBeTruthy();
  }
}

/**
 * Create a task (for testing task limits)
 */
export async function createTask(page: Page, title: string): Promise<boolean> {
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');

  // Click add task button
  const addButton = page.locator('[data-testid="add-task"], button:has-text("Add Task"), button:has-text("New Task")');
  await addButton.click();

  // Check if limit modal appears
  const limitModal = await isUpgradeModalVisible(page);
  if (limitModal) {
    await closeUpgradeModal(page);
    return false;
  }

  // Fill task form
  await page.fill('input[name="title"], input[placeholder*="task"]', title);

  // Submit
  await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Add")');

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

  // Look for task count indicator or count task items
  const countIndicator = page.locator('[data-testid="task-count"], text=/\\d+.*tasks?/i');

  if (await countIndicator.isVisible()) {
    const text = await countIndicator.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Count task items
  const taskItems = page.locator('[data-testid="task-item"], .task-item, [class*="task"]');
  return await taskItems.count();
}

/**
 * Simulate Stripe webhook (for local testing only)
 */
export async function simulateStripeWebhook(
  page: Page,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<Response> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // This is for local testing only - in CI, use Stripe CLI
  const response = await fetch(`${baseURL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: Real webhook signature would be required in production
      'Stripe-Signature': 'test_signature',
    },
    body: JSON.stringify({
      type: eventType,
      data: { object: payload },
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
 * Check subscription status in settings
 */
export async function getSubscriptionStatus(page: Page): Promise<{
  tier: string;
  status: string;
}> {
  await page.goto('/settings?tab=subscription');
  await page.waitForLoadState('networkidle');

  // Extract tier and status from page
  const tierElement = page.locator('[data-testid="subscription-tier"], .subscription-tier');
  const statusElement = page.locator('[data-testid="subscription-status"], .subscription-status');

  const tier = await tierElement.textContent() || 'free';
  const status = await statusElement.textContent() || 'active';

  return {
    tier: tier.toLowerCase(),
    status: status.toLowerCase(),
  };
}
