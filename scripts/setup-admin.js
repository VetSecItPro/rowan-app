#!/usr/bin/env node

/**
 * Admin Setup Script
 * Creates the admin user in Supabase Auth for ops dashboard access
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = 'ops@steelmotionllc.com';
const ADMIN_PASSWORD = 'RowanOps2025!'; // Temporary password for development

async function setupAdmin() {
  console.log('🚀 Setting up admin user for Rowan Operations Dashboard...\n');

  try {
    // Step 1: Check if admin_users table exists and has the admin record
    console.log('1️⃣ Checking admin_users table...');
    const { data: adminUsers, error: adminUsersError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', ADMIN_EMAIL);

    if (adminUsersError) {
      console.error(`❌ Error checking admin_users table:`, adminUsersError);
      console.log('💡 Run the database migrations first: npx supabase db push');
      return;
    }

    if (adminUsers && adminUsers.length > 0) {
      console.log(`✅ Admin user record exists in admin_users table`);
    } else {
      console.log(`⚠️ Admin user record not found in admin_users table`);
      console.log('💡 This should be created by migration 20251027000011_admin_users.sql');
      return;
    }

    // Step 2: Check if Supabase auth user exists
    console.log('\n2️⃣ Checking Supabase auth user...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const existingAdmin = existingUsers.users.find(user => user.email === ADMIN_EMAIL);

    if (existingAdmin) {
      console.log('✅ Admin auth user already exists');
      console.log('🔑 You can login with:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      return;
    }

    // Step 3: Create Supabase auth user
    console.log('\n3️⃣ Creating Supabase auth user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        created_by: 'setup-script',
        created_at: new Date().toISOString()
      }
    });

    if (createError) {
      console.error('❌ Error creating admin user:', createError);
      return;
    }

    console.log('✅ Admin auth user created successfully!');

    // Step 4: Verify the setup
    console.log('\n4️⃣ Verifying setup...');

    // Test authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (authError) {
      console.error('❌ Error testing authentication:', authError);
      return;
    }

    console.log('✅ Authentication test successful!');

    // Sign out
    await supabase.auth.signOut();

    // Final success message
    console.log('\n🎉 Admin setup completed successfully!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log(`   URL: http://localhost:3000/admin`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️ IMPORTANT: Change this password after first login in production!');
    console.log('\n🔒 Security Notes:');
    console.log('   - All admin access is logged');
    console.log('   - Session expires after 24 hours');
    console.log('   - Admin-only routes are protected');

  } catch (error) {
    console.error('❌ Unexpected error during admin setup:', error);
  }
}

// Run the setup
setupAdmin().catch(console.error);