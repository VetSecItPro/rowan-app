/**
 * Concurrent Authentication & Subscription Load Test
 *
 * Tests the full user experience under concurrent load:
 * - 10 users sign up simultaneously
 * - Each user's SubscriptionProvider fetches subscription data
 * - Verify all users see correct subscription tier
 * - Measure timing and success rate
 *
 * This tests the COMPLETE flow that users experience, including:
 * - Signup/authentication
 * - JWT token creation
 * - Session cookie handling
 * - SubscriptionProvider fetch
 * - UI rendering of subscription tier
 */

import { test as base, expect, Browser, BrowserContext } from '@playwright/test';

// Override test to remove storage state dependency
const test = base.extend({
  storageState: async ({}, use) => {
    // No storage state - each test creates fresh users
    await use(undefined);
  },
});
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TestUser {
  id: number;
  email: string;
  password: string;
  name: string;
  tier: 'free' | 'pro' | 'family';
}

interface TestResult {
  userId: number;
  email: string;
  success: boolean;
  duration: number;
  tier?: string;
  error?: string;
  signupDuration?: number;
  fetchDuration?: number;
}

/**
 * Generate test users with unique emails
 */
function generateTestUsers(count: number): TestUser[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    email: `concurrent-test-${timestamp}-user${i + 1}@test.rowan.test`,
    password: 'ConcurrentTest$2026!SecurePassword#123',
    name: `Test User ${i + 1}`,
    tier: i % 3 === 0 ? 'family' : i % 2 === 0 ? 'pro' : 'free', // Mix of tiers
  }));
}

/**
 * Sign up a user and verify subscription tier display
 */
async function testConcurrentUser(
  browser: Browser,
  user: TestUser,
  baseURL: string
): Promise<TestResult> {
  const startTime = Date.now();
  let context: BrowserContext | undefined;

  try {
    console.log(`[User ${user.id}] Starting signup flow...`);

    // Create isolated browser context
    context = await browser.newContext();
    const page = await context.newPage();

    // Step 1: Navigate to signup page
    const signupStart = Date.now();
    await page.goto(`${baseURL}/signup`);
    await page.waitForLoadState('networkidle');

    // Step 2: Fill signup form
    await page.getByTestId('signup-name-input').fill(user.name);
    await page.getByTestId('signup-email-input').fill(user.email);
    await page.getByTestId('signup-password-input').fill(user.password);

    // Step 3: Submit signup
    await page.getByTestId('signup-submit-button').click();

    // Step 4: Wait for redirect to dashboard (auth success)
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    const signupDuration = Date.now() - signupStart;

    console.log(`[User ${user.id}] ✅ Signup complete (${signupDuration}ms)`);

    // Step 5: Navigate to settings to verify subscription tier
    const fetchStart = Date.now();
    await page.goto(`${baseURL}/settings?tab=subscription`);
    await page.waitForLoadState('networkidle');

    // Step 6: Wait for subscription data to load (SubscriptionProvider fetch)
    const planElement = page.getByTestId('subscription-plan-name');
    await planElement.waitFor({ state: 'visible', timeout: 30000 });

    const displayedTier = await planElement.textContent();
    const fetchDuration = Date.now() - fetchStart;

    console.log(`[User ${user.id}] ✅ Tier displayed: ${displayedTier} (${fetchDuration}ms)`);

    // Verify correct tier is displayed
    const expectedTierText = user.tier === 'free' ? 'Free Plan' :
                            user.tier === 'pro' ? 'Pro Plan' : 'Family Plan';

    const isCorrect = displayedTier?.includes(expectedTierText.split(' ')[0]) || false;

    const totalDuration = Date.now() - startTime;

    await context.close();

    return {
      userId: user.id,
      email: user.email,
      success: isCorrect,
      duration: totalDuration,
      tier: displayedTier || undefined,
      signupDuration,
      fetchDuration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`[User ${user.id}] ❌ Error: ${errorMessage} (${duration}ms)`);

    if (context) {
      await context.close().catch(() => {});
    }

    return {
      userId: user.id,
      email: user.email,
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Set subscription tiers for test users in database
 */
async function setUserTiers(users: TestUser[], userIds: Map<string, string>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const user of users) {
    const supabaseUserId = userIds.get(user.email);
    if (!supabaseUserId) continue;

    const { error } = await supabase
      .from('subscriptions')
      .update({
        tier: user.tier,
        status: 'active',
      })
      .eq('user_id', supabaseUserId);

    if (error) {
      console.error(`Failed to set tier for ${user.email}:`, error.message);
    }
  }

  console.log(`✅ Set subscription tiers for ${users.length} users\n`);
}

/**
 * Cleanup test users from database
 */
async function cleanupTestUsers(userIds: Map<string, string>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const [email, userId] of userIds.entries()) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`Failed to delete user ${email}:`, error.message);
    }
  }

  console.log(`✅ Cleaned up ${userIds.size} test users\n`);
}

test.describe('Concurrent Authentication Load Test', () => {
  test('10 users sign up concurrently and all see correct subscription tier', async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('baseURL is required for this test');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Concurrent Authentication & Subscription Load Test');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Generate 10 test users
    const testUsers = generateTestUsers(10);
    console.log('Generated 10 test users:');
    testUsers.forEach(u => console.log(`  - User ${u.id}: ${u.email} (tier: ${u.tier})`));
    console.log();

    // Track created user IDs for cleanup
    const createdUserIds = new Map<string, string>();

    try {
      // Step 1: Spawn 10 concurrent signup flows
      console.log('Step 1: Spawning 10 concurrent signup flows...\n');

      const testStartTime = Date.now();
      const promises = testUsers.map(user => testConcurrentUser(browser, user, baseURL));
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - testStartTime;

      // Step 2: Get user IDs from Supabase for tier assignment
      console.log('\nStep 2: Fetching user IDs from database...');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      for (const user of testUsers) {
        const { data } = await supabase.auth.admin.listUsers();
        const foundUser = data.users.find(u => u.email === user.email);
        if (foundUser) {
          createdUserIds.set(user.email, foundUser.id);
        }
      }

      console.log(`✅ Found ${createdUserIds.size} user IDs\n`);

      // Step 3: Set subscription tiers
      console.log('Step 3: Setting subscription tiers...');
      await setUserTiers(testUsers, createdUserIds);

      // Step 4: Analyze results
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Test Results');
      console.log('═══════════════════════════════════════════════════════════════\n');

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`Total Duration: ${totalDuration}ms`);
      console.log(`Success Rate: ${successful.length}/10 (${(successful.length / 10 * 100).toFixed(1)}%)\n`);

      if (successful.length > 0) {
        const durations = successful.map(r => r.duration);
        const signupDurations = successful.map(r => r.signupDuration || 0).filter(d => d > 0);
        const fetchDurations = successful.map(r => r.fetchDuration || 0).filter(d => d > 0);

        console.log('Successful Users:');
        console.log(`  Total Flow (signup + fetch):`);
        console.log(`    • Average: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0)}ms`);
        console.log(`    • Min: ${Math.min(...durations)}ms`);
        console.log(`    • Max: ${Math.max(...durations)}ms`);

        if (signupDurations.length > 0) {
          console.log(`  Signup Phase:`);
          console.log(`    • Average: ${(signupDurations.reduce((a, b) => a + b, 0) / signupDurations.length).toFixed(0)}ms`);
        }

        if (fetchDurations.length > 0) {
          console.log(`  Subscription Fetch Phase:`);
          console.log(`    • Average: ${(fetchDurations.reduce((a, b) => a + b, 0) / fetchDurations.length).toFixed(0)}ms`);
        }

        console.log('\nTier Verification:');
        successful.forEach(result => {
          console.log(`  • User ${result.userId}: ${result.tier || 'unknown'}`);
        });
      }

      if (failed.length > 0) {
        console.log('\n❌ Failed Users:');
        failed.forEach(result => {
          console.log(`  • User ${result.userId}: ${result.error} (${result.duration}ms)`);
        });
      }

      // Step 5: Assertions
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('Verdict');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Assert: At least 8/10 should succeed (80% success rate)
      expect(successful.length).toBeGreaterThanOrEqual(8);
      console.log(`✅ Success rate acceptable: ${successful.length}/10 users`);

      // Assert: Average total duration should be under 30 seconds
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      expect(avgDuration).toBeLessThan(30000);
      console.log(`✅ Average duration acceptable: ${avgDuration.toFixed(0)}ms`);

      // Assert: No timeouts (duration should be < 60s with retry logic)
      const maxDuration = Math.max(...successful.map(r => r.duration));
      expect(maxDuration).toBeLessThan(60000);
      console.log(`✅ No timeouts detected: max ${maxDuration}ms`);

      console.log('\n✅ PASS - Concurrent authentication and subscription fetch working correctly\n');

    } finally {
      // Cleanup: Delete test users
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Cleanup');
      console.log('═══════════════════════════════════════════════════════════════\n');

      if (createdUserIds.size > 0) {
        await cleanupTestUsers(createdUserIds);
      }
    }
  });

  test('20 users sign up concurrently (stress test)', async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('baseURL is required for this test');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Stress Test: 20 Concurrent Users');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const testUsers = generateTestUsers(20);
    const createdUserIds = new Map<string, string>();

    try {
      console.log('Spawning 20 concurrent signup flows...\n');

      const testStartTime = Date.now();
      const promises = testUsers.map(user => testConcurrentUser(browser, user, baseURL));
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - testStartTime;

      // Get user IDs
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      for (const user of testUsers) {
        const { data } = await supabase.auth.admin.listUsers();
        const foundUser = data.users.find(u => u.email === user.email);
        if (foundUser) {
          createdUserIds.set(user.email, foundUser.id);
        }
      }

      // Set tiers
      await setUserTiers(testUsers, createdUserIds);

      // Analyze
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Stress Test Results');
      console.log('═══════════════════════════════════════════════════════════════\n');

      console.log(`Total Duration: ${totalDuration}ms`);
      console.log(`Success Rate: ${successful.length}/20 (${(successful.length / 20 * 100).toFixed(1)}%)\n`);

      if (successful.length > 0) {
        const durations = successful.map(r => r.duration);
        console.log('Performance:');
        console.log(`  • Average: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0)}ms`);
        console.log(`  • Min: ${Math.min(...durations)}ms`);
        console.log(`  • Max: ${Math.max(...durations)}ms`);
      }

      if (failed.length > 0) {
        console.log('\n❌ Failed Users:');
        failed.forEach(result => {
          console.log(`  • User ${result.userId}: ${result.error}`);
        });
      }

      // Less strict assertions for stress test
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('Verdict');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // At least 60% should succeed under stress
      expect(successful.length).toBeGreaterThanOrEqual(12);
      console.log(`✅ Stress test passed: ${successful.length}/20 users succeeded\n`);

    } finally {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Cleanup');
      console.log('═══════════════════════════════════════════════════════════════\n');

      if (createdUserIds.size > 0) {
        await cleanupTestUsers(createdUserIds);
      }
    }
  });
});
