/**
 * Playwright Auth Setup
 *
 * Runs before all E2E tests:
 * 1. Logs in each user via UI (test user seeding handled by global-setup.ts or CI seed job)
 * 2. Verifies redirect to authenticated page
 * 3. Validates auth session via API call
 * 4. Saves storage state to .auth/{userType}.json
 *
 * Individual test files use `test.use({ storageState })` to load pre-authenticated sessions.
 */

import { test as setup } from '@playwright/test';

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
  for (const [userType, user] of Object.entries(TEST_USERS)) {
    setup(`authenticate as ${userType} user`, async ({ page }) => {
      // Auth setup can be slow in CI (dev server compilation, Supabase latency)
      setup.setTimeout(120000);

      console.log(`🔐 Authenticating as ${userType} (${user.email})...`);

      // Navigate to login
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Dismiss cookie banner if present
      const cookieBtn = page.locator('[data-testid="cookie-consent-accept"], button:has-text("Accept"), button:has-text("Essential")').first();
      if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieBtn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // Fill login form — use testid first, fall back to input type
      const emailInput = page.locator('[data-testid="login-email-input"], input[type="email"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(user.email);

      const passwordInput = page.locator('[data-testid="login-password-input"], input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill(user.password);

      // Submit form
      await page.keyboard.press('Enter');
      console.log(`  ✓ Submitted login form`);

      // Wait for redirect away from /login
      // In CI the redirect can take 10-20s due to dev server compilation and Supabase latency
      await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 45000 });

      const redirectedUrl = page.url();
      console.log(`  ✓ Redirected to: ${redirectedUrl}`);

      // Wait for page to finish loading
      await page.waitForLoadState('networkidle').catch(() => {});

      // VALIDATE: Make an API call to confirm the session has valid auth cookies.
      // This is the definitive check — if /api/spaces returns 200, we're authenticated.
      let apiVerified = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const response = await page.request.get('/api/csrf/token', { timeout: 10000 }).catch(() => null);
        if (response?.ok()) {
          apiVerified = true;
          console.log(`  ✓ API auth verified (attempt ${attempt})`);
          break;
        }
        console.log(`  API check attempt ${attempt}/5 returned ${response?.status() ?? 'error'}`);
        if (attempt < 5) await page.waitForTimeout(2000);
      }

      if (!apiVerified) {
        const bodyText = await page.locator('body').textContent().catch(() => '(unreadable)');
        console.error(`  ✗ API verification failed. URL: ${page.url()}`);
        console.error(`  Page text: ${bodyText?.substring(0, 200)}`);
        throw new Error(`Auth API verification failed for ${userType} — session cookies not set`);
      }

      // Save storage state
      await page.context().storageState({ path: user.storageState });
      console.log(`  ✓ Saved session to ${user.storageState}\n`);
    });
  }
});
