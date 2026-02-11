/**
 * Find Concurrent Signup Breaking Point
 *
 * Tests 1, 2, 5, 10, 20 concurrent signups to find where the system breaks.
 * This is diagnostic - tells us the REAL bottleneck.
 *
 * Usage: pnpm tsx scripts/find-signup-breaking-point.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SignupResult {
  userId: number;
  success: boolean;
  duration: number;
  error?: string;
  phase?: 'auth' | 'db' | 'unknown';
}

/**
 * Attempt to sign up a single user
 */
async function attemptSignup(userId: number): Promise<SignupResult> {
  const startTime = Date.now();
  const email = `breaking-point-test-${Date.now()}-user${userId}@test.rowan.test`;
  const password = 'BreakingPoint$Test2026!Secure';

  const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  try {
    // Attempt signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: `Test User ${userId}` },
      },
    });

    const duration = Date.now() - startTime;

    if (error) {
      return {
        userId,
        success: false,
        duration,
        error: error.message,
        phase: 'auth',
      };
    }

    if (!data.user) {
      return {
        userId,
        success: false,
        duration,
        error: 'No user returned',
        phase: 'auth',
      };
    }

    return {
      userId,
      success: true,
      duration,
    };
  } catch (error) {
    return {
      userId,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      phase: 'unknown',
    };
  }
}

/**
 * Test N concurrent signups
 */
async function testConcurrentSignups(count: number): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${count} Concurrent Signup${count > 1 ? 's' : ''}`);
  console.log('='.repeat(70));

  const startTime = Date.now();
  const promises = Array.from({ length: count }, (_, i) => attemptSignup(i + 1));
  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nResults:`);
  console.log(`  Total Duration: ${totalDuration}ms`);
  console.log(`  Success: ${successful.length}/${count} (${(successful.length / count * 100).toFixed(1)}%)`);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`\n  Successful Signups:`);
    console.log(`    Average: ${avg.toFixed(0)}ms`);
    console.log(`    Min: ${Math.min(...durations)}ms`);
    console.log(`    Max: ${Math.max(...durations)}ms`);
  }

  if (failed.length > 0) {
    console.log(`\n  ❌ Failed Signups (${failed.length}):`);

    // Group by error message
    const errorGroups = failed.reduce((acc, r) => {
      const key = r.error || 'Unknown error';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r.userId);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(errorGroups).forEach(([error, userIds]) => {
      console.log(`    "${error}": Users ${userIds.join(', ')}`);
    });
  }

  // Cleanup
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  for (const result of results) {
    const email = `breaking-point-test-${Date.now()}-user${result.userId}@test.rowan.test`;
    const { data } = await supabase.auth.admin.listUsers();
    const user = data.users.find(u => u.email?.startsWith(`breaking-point-test-`));
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('═'.repeat(70));
  console.log('Concurrent Signup Breaking Point Test');
  console.log('═'.repeat(70));
  console.log('\nThis test will find where the system starts failing.');
  console.log('Testing: 1, 2, 5, 10, 20 concurrent signups\n');

  await testConcurrentSignups(1);   // Baseline
  await testConcurrentSignups(2);   // Minimal concurrency
  await testConcurrentSignups(5);   // Moderate concurrency
  await testConcurrentSignups(10);  // High concurrency
  await testConcurrentSignups(20);  // Stress test

  console.log(`\n${'═'.repeat(70)}`);
  console.log('Summary');
  console.log('═'.repeat(70));
  console.log(`
Review the results above to identify:
  1. At what concurrency level do failures start?
  2. What are the error messages?
  3. How long do successful signups take?

Common patterns:
  • All succeed at 1-2, fail at 5+     → Rate limiting
  • Slow at 5+, timeout at 10+         → DB connection pool
  • "User already exists" errors       → Race condition in signup
  • "Too many requests"                → Rate limiting confirmed
  • Random failures                    → Supabase Auth throttling
  `);
}

main().catch(console.error);
