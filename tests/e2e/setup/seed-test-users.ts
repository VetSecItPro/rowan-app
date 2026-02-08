/**
 * E2E Test User Seed Script
 *
 * Creates/upserts the 4 E2E test users in Supabase with proper tier subscriptions.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx tests/e2e/setup/seed-test-users.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - E2E_TEST_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';

interface TestUser {
  email: string;
  password: string;
  name: string;
  tier: 'free' | 'pro' | 'family';
}

const TEST_USERS: TestUser[] = [
  {
    email: 'smoke.test@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || process.env.SMOKE_TEST_PASSWORD || '',
    name: 'Smoke Test',
    tier: 'pro',
  },
  {
    email: 'test-free@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    name: 'Free Test User',
    tier: 'free',
  },
  {
    email: 'test-pro@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    name: 'Pro Test User',
    tier: 'pro',
  },
  {
    email: 'test-family@rowan-test.app',
    password: process.env.E2E_TEST_PASSWORD || '',
    name: 'Family Test User',
    tier: 'family',
  },
];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedTestUsers() {
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

  console.log('🌱 Seeding E2E test users...\n');

  for (const testUser of TEST_USERS) {
    if (!testUser.password) {
      console.error(`❌ ${testUser.email}: No password provided (check E2E_TEST_PASSWORD env var)`);
      process.exit(1);
    }

    try {
      // Step 1: Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === testUser.email);

      let userId: string;

      if (existingUser) {
        console.log(`✓ ${testUser.email}: Already exists (${existingUser.id})`);
        userId = existingUser.id;
      } else {
        // Step 2: Create user
        console.log(`  Creating ${testUser.email}...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            name: testUser.name,
          },
        });

        if (createError || !newUser?.user) {
          throw new Error(`Failed to create user: ${createError?.message}`);
        }

        userId = newUser.user.id;
        console.log(`  ✓ Created user: ${userId}`);

        // Step 3: Wait for DB trigger to provision space
        console.log('  Waiting for space provisioning (1.5s)...');
        await sleep(1500);
      }

      // Step 4: Verify user profile exists in public.users (created by trigger)
      console.log('  Verifying user profile...');
      let retries = 0;
      let userProfileExists = false;
      while (retries < 5 && !userProfileExists) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .limit(1)
          .single();

        if (userProfile) {
          userProfileExists = true;
          console.log(`  ✓ User profile verified`);
        } else {
          console.log(`  Retry ${retries + 1}/5: Waiting for profile...`);
          await sleep(500);
          retries++;
        }
      }

      if (!userProfileExists) {
        throw new Error('User profile not created — create_user_profile trigger failed');
      }

      // Step 5: Verify space exists (created by second trigger)
      console.log('  Verifying space provisioning...');
      retries = 0;
      let spaceId: string | null = null;
      while (retries < 5 && !spaceId) {
        const { data: spaceMember } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (spaceMember?.space_id) {
          spaceId = spaceMember.space_id;
          console.log(`  ✓ Space provisioned: ${spaceId}`);
        } else {
          console.log(`  Retry ${retries + 1}/5: Waiting for space...`);
          await sleep(500);
          retries++;
        }
      }

      if (!spaceId) {
        // Try to fix orphaned user using the built-in function
        console.log('  Space not auto-provisioned, attempting manual fix...');
        const { data: fixResult, error: fixError } = await supabase.rpc('fix_orphaned_users');

        if (fixError) {
          throw new Error(`Space provisioning failed and manual fix failed: ${fixError.message}`);
        }

        // Verify space was created
        const { data: spaceMember } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (!spaceMember?.space_id) {
          throw new Error('Space provisioning failed even after manual fix');
        }

        spaceId = spaceMember.space_id;
        console.log(`  ✓ Space fixed manually: ${spaceId}`);
      }

      // Step 6: Upsert subscription
      const { error: subError } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          tier: testUser.tier,
          status: 'active',
          billing_interval: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        },
        {
          onConflict: 'user_id',
        }
      );

      if (subError) {
        throw new Error(`Failed to upsert subscription: ${subError.message}`);
      }

      console.log(`  ✓ Subscription set to: ${testUser.tier}\n`);
    } catch (error) {
      console.error(`❌ ${testUser.email}: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  }

  console.log('✅ All E2E test users seeded successfully');
}

seedTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
