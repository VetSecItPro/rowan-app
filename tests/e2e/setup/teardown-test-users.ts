/**
 * E2E Test User Teardown Script
 *
 * Deletes all E2E test users and their cascaded resources from Supabase.
 * Runs after E2E tests complete to ensure clean state.
 *
 * Usage:
 *   npx tsx tests/e2e/setup/teardown-test-users.ts
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

async function teardownTestUsers() {
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

  console.log('🧹 Tearing down E2E test users...\n');

  const deletedUserIds: string[] = [];

  for (const email of TEST_USER_EMAILS) {
    try {
      // Step 1: Find user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const user = existingUsers?.users?.find((u) => u.email === email);

      if (!user) {
        console.log(`  ${email}: Not found (already deleted or never existed)`);
        continue;
      }

      deletedUserIds.push(user.id);

      // Step 2: Delete user via auth admin (cascades to public.users → spaces → space_members → subscriptions)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        throw new Error(`Failed to delete user: ${deleteError.message}`);
      }

      console.log(`  ✓ ${email}: Deleted (${user.id})`);
    } catch (error) {
      console.error(`  ❌ ${email}: ${error instanceof Error ? error.message : String(error)}`);
      // Continue to next user even if one fails
    }
  }

  // Step 3: Clean up orphaned data (defensive — should cascade automatically)
  if (deletedUserIds.length > 0) {
    console.log('\n🧹 Cleaning up orphaned data...');

    const { error: subError } = await supabase
      .from('subscriptions')
      .delete()
      .in('user_id', deletedUserIds);

    if (subError) {
      console.warn(`  ⚠️ Orphaned subscriptions cleanup failed: ${subError.message}`);
    } else {
      console.log('  ✓ Orphaned subscriptions cleaned');
    }

    const { error: spaceError } = await supabase
      .from('spaces')
      .delete()
      .in('created_by', deletedUserIds);

    if (spaceError) {
      console.warn(`  ⚠️ Orphaned spaces cleanup failed: ${spaceError.message}`);
    } else {
      console.log('  ✓ Orphaned spaces cleaned');
    }
  }

  console.log('\n✅ E2E test user teardown complete');
}

teardownTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
