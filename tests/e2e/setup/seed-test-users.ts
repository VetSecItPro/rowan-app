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

      // Step 4: Verify space exists
      const { data: spaceMember } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!spaceMember?.space_id) {
        throw new Error('Space not provisioned — DB trigger may have failed');
      }

      console.log(`  ✓ Space provisioned: ${spaceMember.space_id}`);

      // Step 5: Upsert subscription
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
