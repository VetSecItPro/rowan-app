/**
 * E2E Test User Seed Script
 *
 * Creates or updates the E2E test users in Supabase with proper tier subscriptions.
 * **Idempotent** — safe to run multiple times, even concurrently from different
 * CI runners. Existing users are updated in-place (password reset, subscription
 * verified) rather than deleted and recreated, which prevents invalidating
 * sessions held by other parallel workflows.
 *
 * Usage:
 *   npx tsx tests/e2e/setup/seed-test-users.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - E2E_TEST_PASSWORD
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local for local development
config({ path: '.env.local' });

interface TestUser {
  email: string;
  password: string;
  name: string;
  tier: 'free' | 'pro' | 'family';
}

const TEST_USERS: TestUser[] = [
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
      // Step 1: Check if auth user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = existingUsers?.users?.find((u) => u.email === testUser.email);

      let userId: string;

      if (existingAuthUser) {
        // ── User exists: update in-place (idempotent, no session invalidation) ──
        userId = existingAuthUser.id;
        console.log(`  Found existing user ${testUser.email} (${userId})`);

        // Update password to ensure it matches (in case env changed)
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: testUser.password,
          email_confirm: true,
          user_metadata: { name: testUser.name },
        });

        if (updateError) {
          throw new Error(`Failed to update user password: ${updateError.message}`);
        }
        console.log(`  ✓ Password and metadata updated`);
      } else {
        // ── User doesn't exist: create fresh ──
        console.log(`  Creating ${testUser.email}...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: { name: testUser.name },
        });

        if (createError || !newUser?.user) {
          throw new Error(`Failed to create user: ${createError?.message}`);
        }

        userId = newUser.user.id;
        console.log(`  ✓ Created user: ${userId}`);

        // Wait for DB trigger to provision profile + space
        console.log('  Waiting for trigger provisioning (2s)...');
        await sleep(2000);
      }

      // Step 2: Verify user profile exists in public.users
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
        // Trigger didn't fire — create profile manually
        console.log('  Profile not found, creating manually...');

        const { error: profileError } = await supabase
          .from('users')
          .upsert(
            {
              id: userId,
              email: testUser.email,
              name: testUser.name,
              color_theme: 'emerald',
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        console.log(`  ✓ User profile created manually`);
        await sleep(500);
      }

      // Step 3: Verify space exists
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
          console.log(`  ✓ Space verified: ${spaceId}`);
        } else {
          console.log(`  Retry ${retries + 1}/5: Waiting for space...`);
          await sleep(500);
          retries++;
        }
      }

      if (!spaceId) {
        // Create space manually
        console.log('  Space not found, creating manually...');

        const spaceName = `${testUser.name}'s Space`;
        const { data: newSpace, error: spaceError } = await supabase
          .from('spaces')
          .insert({
            name: spaceName,
            is_personal: true,
            auto_created: true,
            user_id: userId,
          })
          .select('id')
          .single();

        if (spaceError || !newSpace) {
          throw new Error(`Failed to create space: ${spaceError?.message || 'Unknown error'}`);
        }

        spaceId = newSpace.id;
        console.log(`  ✓ Space created: ${spaceId}`);

        const { error: memberError } = await supabase
          .from('space_members')
          .insert({
            space_id: spaceId,
            user_id: userId,
            role: 'owner',
          });

        if (memberError) {
          throw new Error(`Failed to create space membership: ${memberError.message}`);
        }
        console.log(`  ✓ Space membership created`);
      }

      // Step 4: Upsert subscription
      const { error: subError } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          tier: testUser.tier,
          status: 'active',
          period: 'monthly',
          subscription_started_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (subError) {
        throw new Error(`Failed to upsert subscription: ${subError.message}`);
      }

      console.log(`  ✓ Subscription set to: ${testUser.tier}`);
      console.log(`  ✓ User ${testUser.email} ready\n`);
    } catch (error) {
      console.error(`❌ ${testUser.email}: ${error instanceof Error ? error.message : String(error)}\n`);
      throw error;
    }
  }

  console.log('✅ All E2E test users seeded successfully');
}

seedTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
