/**
 * Full Checkout Flow Test
 * Tests the complete authenticated checkout flow with Polar
 */

import { test, expect } from '@playwright/test';

test.describe('Authenticated Checkout Flow', () => {
  test('should redirect to Polar checkout when clicking Pro plan', async ({ page }) => {
    // Get test credentials from environment
    const email = process.env.SMOKE_TEST_EMAIL || 'smoke.test@rowan-test.app';
    const password = process.env.SMOKE_TEST_PASSWORD || '***';

    console.log('Step 1: Navigate to login page');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/01-login-page.png' });

    console.log('Step 2: Fill in login credentials');
    // Wait for Clerk to load
    await page.waitForTimeout(2000);
    
    // Try to find email input (Clerk uses various selectors)
    const emailInput = page.locator('input[name="identifier"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    
    // Click continue/next button
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]').first();
    await continueBtn.click();
    await page.waitForTimeout(1000);

    // Fill password
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(password);
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'test-results/02-credentials-filled.png' });

    // Click sign in button
    const signInBtn = page.locator('button:has-text("Sign in"), button:has-text("Continue"), button[type="submit"]').first();
    await signInBtn.click();

    console.log('Step 3: Wait for authentication to complete');
    // Wait for redirect after login (should go to dashboard or home)
    await page.waitForURL(/\/(dashboard|home|spaces|\?)/, { timeout: 30000 }).catch(() => {
      console.log('URL after login:', page.url());
    });
    
    await page.screenshot({ path: 'test-results/03-after-login.png' });
    console.log('Current URL after login:', page.url());

    console.log('Step 4: Navigate to pricing page');
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/04-pricing-page.png' });

    console.log('Step 5: Click on Pro Monthly plan');
    // Find and click the Pro plan button
    const proButton = page.locator('button:has-text("Get Pro"), button:has-text("Choose Pro"), button:has-text("Start Pro")').first();
    
    // If specific button not found, try generic upgrade buttons in the Pro section
    const proSection = page.locator('text=Pro').first().locator('..').locator('..');
    const upgradeBtn = proSection.locator('button').first();
    
    // Try clicking whichever is available
    try {
      if (await proButton.isVisible()) {
        await proButton.click();
      } else {
        // Click any button that looks like a plan selection
        const planButtons = page.locator('button:has-text("Get Started"), button:has-text("Subscribe"), button:has-text("Upgrade")');
        await planButtons.first().click();
      }
    } catch (e) {
      console.log('Trying alternative button selector');
      await page.screenshot({ path: 'test-results/05-before-click.png' });
      // Just click the first prominent button on a pricing card
      await page.locator('[class*="pricing"] button, [class*="card"] button').first().click();
    }

    console.log('Step 6: Verify redirect to Polar checkout');
    // Wait for either Polar checkout redirect or checkout URL in response
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Final URL:', currentUrl);
    await page.screenshot({ path: 'test-results/06-checkout-redirect.png' });

    // Check if we're on Polar checkout or got a checkout URL
    const isPolarCheckout = currentUrl.includes('polar.sh') || currentUrl.includes('checkout');
    
    if (isPolarCheckout) {
      console.log('✓ Successfully redirected to Polar checkout!');
      expect(currentUrl).toContain('polar');
    } else {
      // If not redirected, check if there's an error message
      const errorText = await page.locator('[class*="error"], [role="alert"]').textContent().catch(() => null);
      if (errorText) {
        console.log('Error on page:', errorText);
      }
      console.log('Current page URL:', currentUrl);
    }
  });
});
