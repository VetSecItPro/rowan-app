#!/usr/bin/env node

/**
 * Check Admin Users Table
 * Verifies if admin user exists in admin_users table and creates if needed
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'admin@example.com';

console.log('🔍 Checking admin_users table...\n');

async function checkAdminTable() {
  try {
    // Check if admin user exists in admin_users table
    const { data: adminUsers, error: queryError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', ADMIN_EMAIL);

    if (queryError) {
      console.error('❌ Error querying admin_users table:', queryError.message);
      if (queryError.message.includes('infinite recursion')) {
        console.log('⚠️  RLS policies still have issues');
      }
      return;
    }

    console.log('✅ Successfully queried admin_users table (RLS is working!)');
    console.log(`📊 Found ${adminUsers?.length || 0} admin user records`);

    if (adminUsers && adminUsers.length > 0) {
      console.log('✅ Admin user record exists in admin_users table');
      console.log('📄 Admin record:', adminUsers[0]);
    } else {
      console.log('⚠️  Admin user record NOT found in admin_users table');
      console.log('🔧 Attempting to create admin_users record...');

      // Insert the admin user record
      const { data: insertData, error: insertError } = await supabase
        .from('admin_users')
        .insert([
          {
            email: ADMIN_EMAIL,
            role: 'super_admin',
            permissions: {
              dashboard: { read: true, write: true, delete: true },
              users: { read: true, write: true, delete: false },
              beta: { read: true, write: true, approve: true },
              notifications: { read: true, write: true, export: true },
              analytics: { read: true, export: true },
              system: { read: true, logs: true, settings: true }
            },
            is_active: true
          }
        ])
        .select();

      if (insertError) {
        console.error('❌ Error creating admin_users record:', insertError.message);
      } else {
        console.log('✅ Admin user record created successfully!');
        console.log('📄 New record:', insertData[0]);
      }
    }

    console.log('\n🎯 Now testing admin login...');

    // Test admin login functionality
    const loginResponse = await fetch('http://localhost:3001/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: 'RowanOps2025!',
      }),
    });

    console.log(`📊 Login Response Status: ${loginResponse.status}`);
    const loginData = await loginResponse.text();
    console.log(`📋 Login Response: ${loginData}`);

    if (loginResponse.ok) {
      console.log('\n🎉 Admin login is now working!');
    } else {
      console.log('\n⚠️  Admin login still failing - checking auth user...');

      // Check if auth user exists
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.log('❌ Cannot check auth users (need service role key)');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkAdminTable().catch(console.error);