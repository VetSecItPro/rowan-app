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
import { execSync } from 'child_process';
import { resilientFill, resilientClick, elementExists } from '@vetsecitpro/e2e-intelligence/helpers/resilient-selectors';

const TEST_USERS = {
  smoke: {
    email: process.env.SMOKE_TEST_EMAIL || 'smoke.test@rowan-test.app',
    password: process.env.SMOKE_TEST_PASSWORD || process.env.E2E_TEST_PASSWORD || '',
    storageState: 'tests/e2e/.auth/smoke.json',
  },
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
  family: {
    email: 'test-family@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    storageState: 'tests/e2e/.auth/family.json',
  },
};

setup.describe('Auth Setup', () => {
  setup.beforeAll(() => {
    console.log('\n🌱 Seeding E2E test users...');
    try {
      execSync('npx tsx tests/e2e/setup/seed-test-users.ts', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Test users seeded\n');
    } catch (error) {
      console.error('❌ Failed to seed test users:', error);
      throw error;
    }
  });

  for (const [userType, user] of Object.entries(TEST_USERS)) {
    setup(`authenticate as ${userType} user`, async ({ page }) => {
      console.log(`🔐 Authenticating as ${userType} (${user.email})...`);

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

      // Submit using resilient click
      await resilientClick(page, 'login-submit-button', {
        role: 'button',
        text: 'Sign In',
      });

      // Wait for redirect to dashboard
      await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 15000 });

      // Wait for page to load completely
      await page.waitForLoadState('networkidle');

      // Verify we're authenticated using resilient selectors
      // Check for dashboard heading or add task button
      const isDashboardVisible = await elementExists(page, 'dashboard-heading', {
        role: 'heading',
      });

      const isAddTaskVisible = await elementExists(page, 'add-task-button', {
        role: 'button',
        text: 'Add Task',
      });

      // At least one auth indicator should be present
      if (!isDashboardVisible && !isAddTaskVisible) {
        throw new Error(`Authentication verification failed for ${userType} user`);
      }

      console.log(`  ✓ Authenticated as ${userType}`);

      // Save storage state
      await page.context().storageState({ path: user.storageState });
      console.log(`  ✓ Saved session to ${user.storageState}\n`);
    });
  }
});
