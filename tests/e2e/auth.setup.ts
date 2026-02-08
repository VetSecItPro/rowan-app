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

      // Fill login form
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      // Submit
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL(/\/(dashboard|tasks)/, { timeout: 15000 });

      // Verify we're authenticated by checking for user-specific UI elements
      await expect(
        page.locator('[data-testid="user-menu"], button:has-text("Account"), nav')
      ).toBeVisible({ timeout: 5000 });

      console.log(`  ✓ Authenticated as ${userType}`);

      // Save storage state
      await page.context().storageState({ path: user.storageState });
      console.log(`  ✓ Saved session to ${user.storageState}\n`);
    });
  }
});
