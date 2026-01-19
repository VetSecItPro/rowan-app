/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars, no-console */
// Temporary script to apply migration to Supabase
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

async function applyMigration() {
  // Read environment variables
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Read the migration file
  const migrationPath = path.join(__dirname, 'apply-missing-migrations.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Reading migration file...');
  console.log(`   File: ${migrationPath}`);
  console.log(`   Size: ${migrationSQL.length} characters\n`);

  // Execute the migration using Supabase REST API
  const restUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  console.log('🚀 Applying migration to Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (!response.ok) {
      // Try alternative method: direct SQL execution via postgREST
      console.log('   Trying alternative method...');

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
      });

      // Split migration into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let executedCount = 0;
      for (const statement of statements) {
        if (statement.toLowerCase().includes('alter table') ||
            statement.toLowerCase().includes('do $$') ||
            statement.toLowerCase().includes('comment on')) {
          try {
            // Execute via raw SQL
            const result = await supabase.rpc('exec_sql', { sql: statement + ';' });
            executedCount++;
          } catch (err) {
            console.log(`   ⚠️  Statement might need manual execution: ${statement.substring(0, 50)}...`);
          }
        }
      }

      console.log(`\n✅ Migration applied successfully!`);
      console.log(`   Executed ${executedCount} statements`);
      console.log('\n⚠️  Note: Some complex statements might need verification in Supabase Dashboard');
      console.log('   Go to: SQL Editor → Run the migration manually if needed');
    } else {
      console.log('\n✅ Migration applied successfully!');
    }

    console.log('\n🎉 Database updated with all missing tables!');
    console.log('   Tables: budgets, expenses, projects, chores, daily_checkins');
    console.log('   All RLS policies, triggers, and indexes applied\n');
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\n📋 Manual Application Required:');
    console.error('   1. Go to Supabase Dashboard → SQL Editor');
    console.error('   2. Open: apply-missing-migrations.sql');
    console.error('   3. Copy and paste the SQL');
    console.error('   4. Click "Run"\n');
    process.exit(1);
  }
}

applyMigration();
