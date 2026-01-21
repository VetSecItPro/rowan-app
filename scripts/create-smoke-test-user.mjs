/* eslint-disable no-console */
/**
 * Create or refresh a dedicated smoke test user for Playwright runs.
 *
 * Run: node scripts/create-smoke-test-user.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const smokeUser = {
  email: process.env.SMOKE_TEST_EMAIL || 'smoke.test@rowan-test.app',
  password: process.env.SMOKE_TEST_PASSWORD || 'SmokeTest123!',
  name: process.env.SMOKE_TEST_NAME || 'Smoke Test',
  spaceName: process.env.SMOKE_TEST_SPACE || 'Smoke Test Space',
  colorTheme: process.env.SMOKE_TEST_COLOR || 'emerald',
};

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  if (error.message?.includes(`column "${column}" does not exist`)) return false;
  throw error;
}

async function ensureAdminUser(email, userId) {
  const [hasUserId, hasRole, hasAdminLevel] = await Promise.all([
    columnExists('admin_users', 'user_id'),
    columnExists('admin_users', 'role'),
    columnExists('admin_users', 'admin_level'),
  ]);

  const { data: existingAdmin, error: adminLookupError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (adminLookupError) {
    throw adminLookupError;
  }

  const payload = {
    email,
    is_active: true,
    permissions: {
      beta_management: true,
      user_management: true,
      feedback_management: true,
      system_admin: true,
    },
  };

  if (hasUserId) {
    payload.user_id = userId;
  }
  if (hasRole) {
    payload.role = 'super_admin';
  }
  if (hasAdminLevel) {
    payload.admin_level = 'super_admin';
  }

  if (existingAdmin) {
    const { error: updateError } = await supabase
      .from('admin_users')
      .update(payload)
      .eq('email', email);

    if (updateError) throw updateError;
    console.log(`✓ Admin access refreshed for ${email}`);
    return;
  }

  const { error: insertError } = await supabase
    .from('admin_users')
    .insert(payload);

  if (insertError) throw insertError;
  console.log(`✓ Admin access granted for ${email}`);
}

async function ensureSpace(userId) {
  const { data: memberships, error: membershipError } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId);

  if (membershipError) {
    throw membershipError;
  }

  if (memberships && memberships.length > 0) {
    return memberships[0].space_id;
  }

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .insert({
      name: smokeUser.spaceName,
      is_personal: true,
      auto_created: true,
      user_id: userId,
    })
    .select('id')
    .single();

  if (spaceError) {
    throw spaceError;
  }

  const { error: memberInsertError } = await supabase
    .from('space_members')
    .insert({
      space_id: space.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberInsertError) {
    throw memberInsertError;
  }

  return space.id;
}

async function ensureUser() {
  const { data: existingUser, error: userLookupError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', smokeUser.email)
    .maybeSingle();

  if (userLookupError) {
    throw userLookupError;
  }

  let userId = existingUser?.id;

  if (!userId) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: smokeUser.email,
      password: smokeUser.password,
      email_confirm: true,
      user_metadata: {
        name: smokeUser.name,
        space_name: smokeUser.spaceName,
        color_theme: smokeUser.colorTheme,
      },
    });

    if (authError) {
      throw authError;
    }

    userId = authData.user.id;
    console.log(`✓ Created auth user ${smokeUser.email}`);

    // Allow auth triggers to populate public.users
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    console.log(`✓ Existing user found for ${smokeUser.email}`);
  }

  const { error: profileUpdateError } = await supabase
    .from('users')
    .update({
      name: smokeUser.name,
      color_theme: smokeUser.colorTheme,
    })
    .eq('id', userId);

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  const spaceId = await ensureSpace(userId);
  await ensureAdminUser(smokeUser.email, userId);

  console.log(`✓ Smoke test user ready (space: ${spaceId})`);
}

ensureUser()
  .then(() => {
    console.log('Smoke test user setup complete.');
  })
  .catch((error) => {
    console.error('Smoke test user setup failed:', error);
    process.exit(1);
  });
