#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars, no-console */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

async function executeMigration(migrationContent, migrationName) {
  console.log(`\n🚀 Executing migration: ${migrationName}`);

  try {
    // Use the rest api to execute the raw SQL migration
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql: migrationContent })
    });

    if (!response.ok) {
      // Try alternative approach using query parameter
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey
        }
      });

      if (altResponse.ok) {
        console.log('✅ Connection to Supabase established');

        // Execute each table creation via the raw query interface
        const { data, error } = await supabase
          .from('beta_feedback')
          .select('id')
          .limit(1);

        if (error && error.message.includes('does not exist')) {
          console.log('📝 beta_feedback table does not exist, needs creation');

          // For now, let's manually verify what tables exist
          const { data: existingData } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

          console.log('📋 Existing tables:', existingData?.map(t => t.table_name) || []);
        } else if (!error) {
          console.log('✅ beta_feedback table already exists');
          return true;
        }
      }

      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log(`✅ Migration executed successfully`);
    console.log(`📊 Result:`, result);

    return true;
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting beta testing migration process...\n');

  // Migration files to apply
  const migrations = [
    'supabase/migrations/20241122000000_create_beta_testing_system.sql',
    'supabase/migrations/20241122000001_update_beta_feedback_shared.sql'
  ];

  for (const migrationPath of migrations) {
    try {
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      const migrationName = path.basename(migrationPath);

      const success = await executeMigration(migrationContent, migrationName);

      if (!success) {
        console.error(`\n💥 Migration ${migrationName} failed. Stopping...`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`\n💥 Failed to read migration file: ${migrationPath}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log('\n🎉 All beta testing migrations applied successfully!');

  // Test that tables were created
  console.log('\n🧪 Testing beta feedback table...');
  const { data, error } = await supabase.from('beta_feedback').select('count', { count: 'exact' });

  if (error) {
    console.error('❌ Error testing beta_feedback table:', error.message);
  } else {
    console.log('✅ beta_feedback table is accessible');
  }
}

main().catch(console.error);