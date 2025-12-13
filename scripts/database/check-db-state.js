#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration - loaded from environment variables (NEVER hardcode secrets)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Please ensure these are set in .env.local:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkBetaTestingTables() {
  console.log('🔍 Checking beta testing database state...\n');

  const tablesToCheck = [
    'beta_feedback',
    'beta_tester_activity',
    'beta_feedback_votes',
    'beta_feedback_comments'
  ];

  for (const tableName of tablesToCheck) {
    console.log(`📋 Checking table: ${tableName}`);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table ${tableName} does not exist`);
        } else {
          console.log(`⚠️  Table ${tableName} error: ${error.message}`);
        }
      } else {
        console.log(`✅ Table ${tableName} exists and is accessible`);
        console.log(`   📊 Sample structure: ${data && data.length > 0 ? Object.keys(data[0]).join(', ') : 'empty table'}`);
      }
    } catch (err) {
      console.log(`💥 Exception checking ${tableName}: ${err.message}`);
    }
  }
}

async function checkUsersTable() {
  console.log('\n🔍 Checking users table for beta tester columns...\n');

  try {
    // Try to select beta tester columns
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_beta_tester, beta_status, beta_signup_date')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Beta tester columns do not exist in users table');
        console.log('   Missing columns: is_beta_tester, beta_status, beta_signup_date');
      } else {
        console.log(`⚠️  Error checking users table: ${error.message}`);
      }
    } else {
      console.log('✅ Beta tester columns exist in users table');
      console.log(`   📊 Found ${data?.length || 0} user records`);
      if (data && data.length > 0) {
        const betaUsers = data.filter(u => u.is_beta_tester);
        console.log(`   🧪 Beta testers: ${betaUsers.length}`);
      }
    }
  } catch (err) {
    console.log(`💥 Exception checking users table: ${err.message}`);
  }
}

async function checkMigrationState() {
  console.log('\n🔍 Checking overall migration state...\n');

  try {
    // Check if there's a supabase_migrations table
    const { data, error } = await supabase
      .from('supabase_migrations')
      .select('*');

    if (error) {
      console.log('❌ supabase_migrations table not accessible');
    } else {
      console.log('✅ supabase_migrations table exists');
      const betaMigrations = data?.filter(m =>
        m.version?.includes('20241122') ||
        m.name?.includes('beta')
      );
      console.log(`   🧪 Beta testing migrations: ${betaMigrations?.length || 0}`);
      if (betaMigrations && betaMigrations.length > 0) {
        betaMigrations.forEach(m => {
          console.log(`   📝 ${m.version}: ${m.name || 'unnamed'}`);
        });
      }
    }
  } catch (err) {
    console.log(`⚠️  Cannot check migration history: ${err.message}`);
  }
}

async function main() {
  console.log('🚀 Starting database state check...\n');

  await checkUsersTable();
  await checkBetaTestingTables();
  await checkMigrationState();

  console.log('\n✅ Database state check completed!');
  console.log('\nNext steps based on findings:');
  console.log('- If beta tables exist: Migrations were already applied');
  console.log('- If beta tables missing: Need to apply migrations');
  console.log('- If users table missing beta columns: Need to run first migration');
}

main().catch(console.error);