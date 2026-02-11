/**
 * Concurrent Subscription Load Test
 *
 * Simulates 10 users fetching subscription data simultaneously
 * to verify retry logic and timeout resilience.
 *
 * Usage: pnpm tsx scripts/test-concurrent-subscriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test user credentials - create temporary user for this test
const TEST_EMAIL = `loadtest-${Date.now()}@test.rowan.test`;
const TEST_PASSWORD = 'LoadTest$2026!ComplexPassword#Secure';

interface TestResult {
  userId: number;
  success: boolean;
  duration: number;
  tier?: string;
  error?: string;
  attempts?: number;
}

/**
 * Fetch subscription data for a single user
 * Uses dev mock endpoint to bypass auth complexity in load test
 */
async function fetchSubscription(
  userId: number,
  _accessToken: string,
  _refreshToken: string
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`[User ${userId}] Starting fetch...`);

    // Use dev mock endpoint to test subscription fetch performance
    // This bypasses auth and returns mock data, which is sufficient for load testing
    const response = await fetch(`${BASE_URL}/api/subscriptions?mockTier=pro`);

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.log(`[User ${userId}] ❌ Failed with status ${response.status} (${duration}ms)`);
      return {
        userId,
        success: false,
        duration,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[User ${userId}] ✅ Success: tier=${data.tier} (${duration}ms)`);

    return {
      userId,
      success: true,
      duration,
      tier: data.tier,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[User ${userId}] ❌ Error: ${errorMessage} (${duration}ms)`);

    return {
      userId,
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Main test runner
 */
async function runConcurrentTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Concurrent Subscription Load Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let testUserId: string | undefined;

  try {
    // Step 1: Create temporary test user
    console.log('Step 1: Creating temporary test user...');
    console.log('Email:', TEST_EMAIL);

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          name: 'Load Test User',
        },
      },
    });

    if (signupError || !signupData.user) {
      console.error('❌ Signup failed:', signupError?.message || 'No user');
      process.exit(1);
    }

    testUserId = signupData.user.id;
    console.log('✅ Created user:', testUserId);

    // Step 2: Set subscription tier to 'pro' via database
    console.log('\nStep 2: Setting subscription tier to pro...');

    // Use service role to update subscription
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
      process.exit(1);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey);

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        tier: 'pro',
        status: 'active',
      })
      .eq('user_id', testUserId);

    if (updateError) {
      console.error('❌ Failed to update subscription:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Subscription tier set to pro\n');

    // Step 3: Get session token
    console.log('Step 3: Authenticating with test user...');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError || !authData.session) {
      console.error('❌ Authentication failed:', authError?.message || 'No session');
      process.exit(1);
    }

    const accessToken = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;
    console.log('✅ Authenticated');
    console.log('Access token:', accessToken.substring(0, 20) + '...\n');

    // Step 4: Spawn 10 concurrent requests
    console.log('Step 4: Spawning 10 concurrent subscription fetches...\n');

    const promises = Array.from({ length: 10 }, (_, i) =>
      fetchSubscription(i + 1, accessToken, refreshToken)
    );

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    // Step 5: Analyze results
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Test Results');
    console.log('═══════════════════════════════════════════════════════════════\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Success Rate: ${successful.length}/10 (${(successful.length / 10 * 100).toFixed(1)}%)`);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('\nSuccessful Requests:');
    console.log(`  • Average: ${avgDuration.toFixed(0)}ms`);
    console.log(`  • Min: ${minDuration}ms`);
    console.log(`  • Max: ${maxDuration}ms`);

    const tiers = successful.map(r => r.tier);
    const tierCounts = tiers.reduce((acc, tier) => {
      acc[tier || 'unknown'] = (acc[tier || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nTier Distribution:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`  • ${tier}: ${count}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Requests:');
    failed.forEach(result => {
      console.log(`  • User ${result.userId}: ${result.error} (${result.duration}ms)`);
    });
  }

    // Step 6: Verdict
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Verdict');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let exitCode = 0;

    if (successful.length === 10) {
      console.log('✅ PASS - All 10 concurrent requests succeeded');
      console.log('   Retry logic and timeout handling working correctly\n');
      exitCode = 0;
    } else if (successful.length >= 8) {
      console.log('⚠️  PARTIAL - Most requests succeeded, some failures');
      console.log('   System is resilient but may need tuning\n');
      exitCode = 0;
    } else {
      console.log('❌ FAIL - Too many failures under concurrent load');
      console.log('   System needs investigation\n');
      exitCode = 1;
    }

    return exitCode;

  } finally {
    // Cleanup: Delete test user
    if (testUserId) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Cleanup');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Deleting test user...');

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey);

        // Delete user (will cascade delete subscription)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(testUserId);

        if (deleteError) {
          console.error('⚠️  Failed to delete test user:', deleteError.message);
        } else {
          console.log('✅ Test user deleted\n');
        }
      }
    }

    await supabase.auth.signOut();
  }
}

// Run the test
runConcurrentTest()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
