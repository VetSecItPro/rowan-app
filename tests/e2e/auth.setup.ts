/**
 * Playwright Auth Setup
 *
 * Runs before all E2E tests:
 * 1. Seeds test users via seed script
 * 2. Logs in each user via UI
 * 3. Saves storage state to .auth/{userType}.json
 *
 * Individual test files use `test.use({ storageState })` to load pre-authenticated sessions.
 */

import { test as setup, expect } from '@playwright/test';
import { resilientFill, resilientClick, elementExists } from './helpers/resilient-selectors';

const TEST_USERS = {
  free: {
    email: 'test-free@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    storageState: 'tests/e2e/.auth/free.json',
  },
  pro: {
    email: 'test-pro@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    storageState: 'tests/e2e/.auth/pro.json',
  },
};

setup.describe('Auth Setup', () => {
  // NOTE: Test user seeding happens in GitHub Actions workflow (seed-users job)
  // This prevents race conditions from multiple test files seeding simultaneously

  for (const [userType, user] of Object.entries(TEST_USERS)) {
    setup(`authenticate as ${userType} user`, async ({ page }) => {
      console.log(`🔐 Authenticating as ${userType} (${user.email})...`);

      // Capture console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`  ❌ Browser console error: ${msg.text()}`);
        }
      });

      // Capture page errors
      page.on('pageerror', err => {
        console.log(`  ❌ Page error: ${err.message}`);
      });

      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Dismiss cookie banner if present (prevents click blocking on mobile viewports)
      const cookieAcceptButton = page.locator('button:has-text("Accept"), button:has-text("Essential")').first();
      if (await cookieAcceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieAcceptButton.click({ timeout: 5000 }).catch(() => {
          console.log('  Cookie banner already dismissed or not found');
        });
        await page.waitForTimeout(500); // Wait for banner to animate out
      }

      // Fill login form using resilient selectors
      await resilientFill(page, 'login-email-input', user.email, {
        role: 'textbox',
        type: 'email',
      });

      await resilientFill(page, 'login-password-input', user.password, {
        role: 'textbox',
        type: 'password',
      });

      // Try pressing Enter to submit instead of clicking button
      await page.keyboard.press('Enter');

      console.log(`  ✓ Pressed Enter to submit form`);

      // CRITICAL: Wait for redirect to initiate before checking URL
      // The login page uses window.location.href which requires a brief moment
      // to trigger the navigation. Without this wait, waitForURL races with the redirect.
      await page.waitForTimeout(2000);

      console.log(`  Current URL after 2s wait: ${page.url()}`);

      // Check for error message
      const errorText = await page.locator('text=/invalid|error|failed/i').first().textContent().catch(() => null);
      if (errorText) {
        console.log(`  ❌ Error message on page: ${errorText}`);
      }

      // Wait for redirect to dashboard
      // Timeout increased to 25s for CI: 3rd/4th login attempts (pro/family) consistently take 19-22s
      // due to resource constraints, rate limiting, or connection pool exhaustion in CI environment
      await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 25000 });

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // ROBUST AUTH VERIFICATION: Retry multiple times to handle auth context hydration
      // In CI, React context may take time to hydrate after SSR
      const maxRetries = 10;
      const retryDelay = 1000; // 1 second between retries
      let verified = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`  Verifying auth (attempt ${attempt}/${maxRetries})...`);

        // Check for dashboard heading or add task button
        const isDashboardVisible = await elementExists(page, 'dashboard-heading', {
          role: 'heading',
        });

        const isAddTaskVisible = await elementExists(page, 'add-task-button', {
          role: 'button',
          text: /New Task|Add Task/i,
        });

        if (isDashboardVisible || isAddTaskVisible) {
          verified = true;
          console.log(`  ✓ Authenticated as ${userType} (verified on attempt ${attempt})`);
          break;
        }

        if (attempt < maxRetries) {
          console.log(`  Retry in ${retryDelay}ms...`);
          await page.waitForTimeout(retryDelay);
        }
      }

      if (!verified) {
        // Log the current URL and page content for debugging
        console.error(`  ✗ Auth verification failed after ${maxRetries} attempts`);
        console.error(`  Current URL: ${page.url()}`);
        const bodyText = await page.locator('body').textContent();
        console.error(`  Page text (first 200 chars): ${bodyText?.substring(0, 200)}`);
        throw new Error(`Authentication verification failed for ${userType} user after ${maxRetries} retries`);
      }

      // Save storage state
      await page.context().storageState({ path: user.storageState });
      console.log(`  ✓ Saved session to ${user.storageState}\n`);
    });
  }
});
