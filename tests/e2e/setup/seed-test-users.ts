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
import * as fs from 'fs';
import * as path from 'path';

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
  // File-based lock to prevent parallel seeding from multiple workers/jobs
  const lockFile = path.join(process.cwd(), '.test-seeding.lock');
  const lockTimeout = 60000; // 60 seconds max wait
  const lockStart = Date.now();

  // Wait for lock to be released
  while (fs.existsSync(lockFile)) {
    if (Date.now() - lockStart > lockTimeout) {
      console.log('⏰ Lock timeout - proceeding anyway (previous run may have crashed)');
      try {
        fs.unlinkSync(lockFile);
      } catch (e) {
        // Ignore errors
      }
      break;
    }
    console.log('⏳ Waiting for another seeding process to complete...');
    await sleep(2000);
  }

  // Create lock file
  try {
    fs.writeFileSync(lockFile, Date.now().toString());
  } catch (e) {
    // If we can't create lock, proceed anyway (file system issue)
    console.log('⚠️  Could not create lock file, proceeding anyway');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Remove lock before exiting
    try {
      fs.unlinkSync(lockFile);
    } catch (e) {
      // Ignore
    }
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
      // Step 1: Check if auth user exists first
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = existingUsers?.users?.find((u) => u.email === testUser.email);

      // Step 2: If auth user exists, delete it completely and start fresh
      // This ensures we don't have mismatches between auth.users and public.users
      if (existingAuthUser) {
        console.log(`  Found existing auth user ${existingAuthUser.id}, cleaning up...`);

        // Delete all related data in correct order
        // 1. First get and delete spaces owned by this user
        const { data: userSpaces } = await supabase
          .from('spaces')
          .select('id')
          .eq('user_id', existingAuthUser.id);

        if (userSpaces) {
          for (const space of userSpaces) {
            await supabase.from('space_members').delete().eq('space_id', space.id);
            await supabase.from('spaces').delete().eq('id', space.id);
          }
        }

        // 2. Delete space memberships
        await supabase.from('space_members').delete().eq('user_id', existingAuthUser.id);

        // 3. Delete subscriptions
        await supabase.from('subscriptions').delete().eq('user_id', existingAuthUser.id);

        // 4. Delete the profile
        await supabase.from('users').delete().eq('id', existingAuthUser.id);

        // 5. Delete the auth user
        await supabase.auth.admin.deleteUser(existingAuthUser.id);

        console.log(`  ✓ Cleaned up existing user completely`);
      }

      // Step 3: Create fresh user (we always delete and recreate to avoid mismatches)
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

      const userId = newUser.user.id;
      console.log(`  ✓ Created user: ${userId}`);

      // Step 4: Wait for DB trigger to provision space
      console.log('  Waiting for space provisioning (1.5s)...');
      await sleep(1500);

      // Step 5: Verify user profile exists in public.users (created by trigger)
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
        // Trigger didn't work - create user profile manually
        console.log('  Trigger failed, creating profile manually...');

        // Check one more time if profile was created by trigger (race condition)
        const { data: raceCheckProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .limit(1)
          .single();

        if (raceCheckProfile) {
          console.log('  ℹ️  Profile appeared during race check (trigger succeeded)');
        } else {
          // Check if trigger created a profile with wrong ID (by email)
          const { data: emailProfile } = await supabase
            .from('users')
            .select('id')
            .eq('email', testUser.email)
            .limit(1)
            .single();

          if (emailProfile && emailProfile.id !== userId) {
            console.log(`  ℹ️  Trigger created profile with wrong ID (${emailProfile.id}), deleting it...`);
            // Delete the wrongly-created profile (and its dependencies)
            const { data: wrongSpaces } = await supabase
              .from('spaces')
              .select('id')
              .eq('user_id', emailProfile.id);

            if (wrongSpaces) {
              for (const space of wrongSpaces) {
                await supabase.from('space_members').delete().eq('space_id', space.id);
                await supabase.from('spaces').delete().eq('id', space.id);
              }
            }

            await supabase.from('space_members').delete().eq('user_id', emailProfile.id);
            await supabase.from('subscriptions').delete().eq('user_id', emailProfile.id);
            await supabase.from('users').delete().eq('id', emailProfile.id);
            console.log(`  ✓ Deleted wrong profile`);
          }

          // Now insert the correct profile with auth user's ID
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: testUser.email,
              name: testUser.name,
              color_theme: 'emerald',
            });

          if (profileError) {
            throw new Error(`Failed to create user profile: ${profileError.message}`);
          }

          console.log(`  ✓ User profile created manually`);
        }

        // Always verify the profile exists now
        await sleep(500);
        const { data: verifiedProfile, error: verifyError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .limit(1)
          .single();

        if (!verifiedProfile) {
          console.error(`  ❌ Verification failed for userId: ${userId}`);
          console.error(`  Verify error:`, verifyError);

          // Try one more time with email lookup
          const { data: emailProfile } = await supabase
            .from('users')
            .select('*')
            .eq('email', testUser.email)
            .limit(1)
            .single();

          if (emailProfile) {
            console.error(`  Found profile by email with ID: ${emailProfile.id}`);
            console.error(`  Expected ID: ${userId}`);
            console.error(`  This is a mismatch - trigger created profile with wrong ID`);
          } else {
            console.error(`  No profile found by email either`);
          }

          throw new Error('Failed to verify user profile after creation attempt');
        }

        console.log(`  ✓ User profile verified`);
      }

      // CRITICAL: Wait for profile transaction to fully commit before checking/creating space
      // This prevents FK constraint violations when manually creating the space
      await sleep(1000);

      // Step 6: Verify space exists (created by second trigger)
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
        // Triggers didn't work - create space manually using service_role
        console.log('  Space not auto-provisioned, creating manually...');

        // Double-check user profile exists before creating space
        const { data: finalProfileCheck } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .limit(1)
          .single();

        if (!finalProfileCheck) {
          throw new Error(`User profile not found for userId ${userId} before space creation`);
        }

        const spaceName = `${testUser.name}'s Space`;

        // Create space
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

        // Add space membership
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

      // Step 7: Upsert subscription
      const { error: subError } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          tier: testUser.tier,
          status: 'active',
          period: 'monthly',
          subscription_started_at: new Date().toISOString(),
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
      // Don't call process.exit(1) here - throw instead so outer catch handler can cleanup lock file
      throw error;
    }
  }

  console.log('✅ All E2E test users seeded successfully');

  // Remove lock file on success
  try {
    fs.unlinkSync(lockFile);
  } catch (e) {
    // Ignore errors
  }
}

seedTestUsers().catch((error) => {
  // Remove lock file on error
  const lockFile = path.join(process.cwd(), '.test-seeding.lock');
  try {
    fs.unlinkSync(lockFile);
  } catch (e) {
    // Ignore errors
  }
  console.error('Fatal error:', error);
  process.exit(1);
});
