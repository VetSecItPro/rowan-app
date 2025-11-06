#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the admin user directly via Supabase Auth signup
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('👤 Admin User Creation Script');
console.log('═════════════════════════════');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'RowanOps2025!';

async function createAdmin() {
  try {
    console.log('🚀 Creating admin user via Supabase Auth...\n');

    // Try to sign up the admin user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          role: 'admin',
          created_by: 'setup-script'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('✅ Admin user already exists in Supabase Auth');

        // Try to sign in to verify credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });

        if (signInError) {
          console.log('⚠️  Sign in failed:', signInError.message);
          console.log('🔄 The user exists but credentials might be different');
        } else {
          console.log('✅ Admin login credentials verified');
          await supabase.auth.signOut();
        }
      } else {
        console.error('❌ Error creating admin user:', signUpError.message);
        return;
      }
    } else {
      console.log('✅ Admin user created successfully in Supabase Auth');
    }

    console.log('\n🎉 Admin user setup completed!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log(`   URL: http://localhost:3002/admin`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

    console.log('\n⚠️  Note: You may still need to fix the RLS policies as shown above');
    console.log('📧 Check your email for any confirmation if signup was required');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
createAdmin().catch(console.error);