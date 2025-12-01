#!/usr/bin/env node

/**
 * Emergency RLS Fix Script
 * Fixes the infinite recursion in admin_users RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log('🔧 Emergency RLS Policy Fix');
console.log('═══════════════════════════');

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Since we don't have service role key, let's try to bypass RLS another way
// by temporarily disabling it or using a different approach

console.log('🎯 Attempting to fix RLS policies...\n');

// We'll need to manually add the service role key or handle this differently
console.log('⚠️  Service role key required to fix RLS policies');
console.log('💡 Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
console.log('🔑 You can find it in your Supabase dashboard under Project Settings > API');
console.log('📱 Or temporarily disable RLS on admin_users table manually');

console.log('\n🛠️  Temporary workaround:');
console.log('1. Go to https://supabase.com/dashboard/project/mhqpjprmpvigmwcghpzx/editor');
console.log('2. Run this SQL in the SQL editor:');
console.log(`
-- Temporarily disable RLS to fix policies
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Super admin only access" ON admin_users;
DROP POLICY IF EXISTS "Admins can read own record" ON admin_users;

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create working policies
CREATE POLICY "Service role full access" ON admin_users
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own record" ON admin_users
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = email
    AND is_active = TRUE
  );
`);

console.log('\n🔄 After fixing, try accessing the admin again');
console.log('📧 Admin email: ops@steelmotionllc.com');
console.log('🔐 Admin password: RowanOps2025!');