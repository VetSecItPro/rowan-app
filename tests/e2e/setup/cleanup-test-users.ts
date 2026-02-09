/**
 * E2E Test User Cleanup Script
 *
 * Deletes all E2E test users from Supabase after test runs.
 * Should be run after E2E tests complete.
 *
 * Usage:
 *   npx tsx tests/e2e/setup/cleanup-test-users.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const TEST_USER_EMAILS = [
  'smoke.test@rowan-test.app',
  'test-free@rowan-test.app',
  'test-pro@rowan-test.app',
  'test-family@rowan-test.app',
];

async function cleanupTestUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🧹 Cleaning up E2E test users...\n');

  for (const email of TEST_USER_EMAILS) {
    try {
      // Find auth user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const authUser = users?.users?.find((u) => u.email === email);

      if (!authUser) {
        console.log(`  ℹ️  ${email}: Not found (already cleaned up)`);
        continue;
      }

      const userId = authUser.id;

      // Delete all related data in correct order
      // 1. Get and delete spaces owned by this user
      const { data: userSpaces } = await supabase
        .from('spaces')
        .select('id')
        .eq('user_id', userId);

      if (userSpaces && userSpaces.length > 0) {
        for (const space of userSpaces) {
          await supabase.from('space_members').delete().eq('space_id', space.id);
          await supabase.from('spaces').delete().eq('id', space.id);
        }
      }

      // 2. Delete space memberships
      await supabase.from('space_members').delete().eq('user_id', userId);

      // 3. Delete subscriptions
      await supabase.from('subscriptions').delete().eq('user_id', userId);

      // 4. Delete the profile
      await supabase.from('users').delete().eq('id', userId);

      // 5. Delete the auth user
      await supabase.auth.admin.deleteUser(userId);

      console.log(`  ✓ ${email}: Deleted completely`);
    } catch (error) {
      console.error(`  ❌ ${email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n✅ E2E test user cleanup complete');
}

cleanupTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
