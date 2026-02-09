import { test, expect } from '@playwright/test';
import { getButton, getInput, elementExists, resilientClick, resilientFill } from '@vetsecitpro/e2e-intelligence/helpers/resilient-selectors';

const BASE_URL = 'http://localhost:3000';

test.describe('Auth Flow Tests', () => {

  test('Homepage loads without beta gate', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for hero CTA using resilient selector
    const ctaButton = await getButton(page, 'hero-cta-signup', 'Try Free for 14 Days');
    await expect(ctaButton).toBeVisible({ timeout: 15000 });

    // Should NOT have any beta gate modal
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).not.toContain('sign up for beta');

    console.log('✓ Homepage loads clean — no beta gate, shows "Try Free for 14 Days"');
  });

  test('Signup page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for form fields using resilient selectors
    const emailInput = await getInput(page, 'signup-email-input', { type: 'email' });
    const passwordInput = await getInput(page, 'signup-password-input', { type: 'password' });

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible();

    // Should have a submit button
    const submitButton = await getButton(page, 'signup-submit-button');
    await expect(submitButton).toBeVisible();

    // Should NOT mention beta anywhere on the page
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).not.toContain('sign up for beta');
    expect(pageText?.toLowerCase()).not.toContain('beta access');
    expect(pageText?.toLowerCase()).not.toContain('beta code');

    console.log('✓ Signup page renders with email, password fields — no beta references');
  });

  test('Signup form validates inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');

    // Try submitting empty form using resilient selector
    await resilientClick(page, 'signup-submit-button', {
      role: 'button',
      text: 'Create Account',
    });

    // Should show validation — page should stay on /signup
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/signup');

    console.log('✓ Signup form validates empty submission');
  });

  test('Signup flow with test data', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');

    // Fill the form using resilient selectors
    await resilientFill(page, 'signup-email-input', 'playwright-test@example.com', {
      role: 'textbox',
      type: 'email',
    });

    await resilientFill(page, 'signup-password-input', process.env.E2E_TEST_PASSWORD || '', {
      role: 'textbox',
      type: 'password',
    });

    // Check for name field
    const hasNameField = await elementExists(page, 'signup-name-input', {
      role: 'textbox',
    });

    if (hasNameField) {
      await resilientFill(page, 'signup-name-input', 'Playwright Tester', {
        role: 'textbox',
      });
    }

    // Submit the form
    await resilientClick(page, 'signup-submit-button', {
      role: 'button',
      text: 'Create Account',
    });

    // Wait for response — either redirect, success message, or error
    await page.waitForTimeout(3000);

    const url = page.url();
    const pageText = await page.textContent('body');

    // Valid outcomes: redirect to dashboard/verify-email, or show a message
    const validOutcome =
      url.includes('/dashboard') ||
      url.includes('/verify-email') ||
      url.includes('/login') ||
      pageText?.toLowerCase().includes('verification') ||
      pageText?.toLowerCase().includes('check your email') ||
      pageText?.toLowerCase().includes('already') ||
      pageText?.toLowerCase().includes('error');

    expect(validOutcome).toBeTruthy();
    console.log(`✓ Signup form submitted — landed on: ${url}`);
  });

  test('Login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Check for form fields using resilient selectors
    const emailInput = await getInput(page, 'login-email-input', { type: 'email' });
    const passwordInput = await getInput(page, 'login-password-input', { type: 'password' });

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible();

    // Should have sign in button
    const signInButton = await getButton(page, 'login-submit-button', 'Sign In');
    await expect(signInButton).toBeVisible();

    // Should have magic link and forgot password options
    const pageText = await page.textContent('body');
    const hasMagicLink = pageText?.toLowerCase().includes('magic link');
    const hasForgotPassword = pageText?.toLowerCase().includes('forgot');

    expect(hasMagicLink || hasForgotPassword).toBeTruthy();

    // Should NOT have beta gate
    expect(pageText?.toLowerCase()).not.toContain('beta access');
    expect(pageText?.toLowerCase()).not.toContain('beta code');

    console.log('✓ Login page renders with email, password, magic link — no beta references');
  });

  test('Login form validates inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Try submitting empty form using resilient selector
    await resilientClick(page, 'login-submit-button', {
      role: 'button',
      text: 'Sign In',
    });

    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');

    console.log('✓ Login form validates empty submission');
  });

  test('Login flow with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill form with invalid credentials using resilient selectors
    await resilientFill(page, 'login-email-input', 'nonexistent@test.com', {
      role: 'textbox',
      type: 'email',
    });

    await resilientFill(page, 'login-password-input', 'WrongPassword123!', {
      role: 'textbox',
      type: 'password',
    });

    // Submit
    await resilientClick(page, 'login-submit-button', {
      role: 'button',
      text: 'Sign In',
    });

    // Should show an error message, NOT redirect to beta-expired
    await page.waitForTimeout(3000);

    const url = page.url();
    const pageText = await page.textContent('body');

    // Should NOT redirect to beta-expired
    expect(url).not.toContain('beta-expired');
    expect(url).not.toContain('beta');

    // Should show an error or stay on login
    const showsError =
      pageText?.toLowerCase().includes('invalid') ||
      pageText?.toLowerCase().includes('error') ||
      pageText?.toLowerCase().includes('incorrect') ||
      pageText?.toLowerCase().includes('not found') ||
      url.includes('/login');

    expect(showsError).toBeTruthy();
    console.log(`✓ Login with bad credentials shows error — no beta redirect. URL: ${url}`);
  });

  test('Pricing page accessible without beta', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.textContent('body');

    // Should show pricing tiers
    const hasPricing =
      pageText?.toLowerCase().includes('free') ||
      pageText?.toLowerCase().includes('pro') ||
      pageText?.toLowerCase().includes('family') ||
      pageText?.toLowerCase().includes('/month');

    expect(hasPricing).toBeTruthy();

    // Should NOT have beta gate
    expect(pageText?.toLowerCase()).not.toContain('beta access required');

    console.log('✓ Pricing page loads — shows plans, no beta gate');
  });

  test('"Try Free for 14 Days" button navigates to signup', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Click CTA using resilient selector
    await resilientClick(page, 'hero-cta-signup', {
      role: 'button',
      text: 'Try Free for 14 Days',
    });

    // Wait for navigation
    await page.waitForURL('**/signup', { timeout: 10000 });
    expect(page.url()).toContain('/signup');

    console.log('✓ "Try Free for 14 Days" navigates to /signup');
  });
});
