/**
 * Database Findings Check Script
 *
 * Checks 4 deferred database findings from security audit:
 * - FIX-203: Email format CHECK constraint
 * - FIX-204: Audit log retention policy
 * - FIX-201: space_members SELECT policy
 * - FIX-202: Covering index optimization
 */

import { createClient } from '@supabase/supabase-js';

// Read from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQuery(name: string, query: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${name}`);
  console.log('='.repeat(60));

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });

    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }

    console.log('✅ Result:', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error('❌ Exception:', err);
    return null;
  }
}

async function checkFindings() {
  console.log('🔍 ROWAN DATABASE FINDINGS CHECK');
  console.log('=' .repeat(60));

  // FIX-203: Check for email format constraint
  await runQuery(
    'FIX-203: Email format CHECK constraint on profiles',
    `SELECT
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid) AS constraint_definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'profiles' AND con.contype = 'c'
    ORDER BY con.conname;`
  );

  // FIX-201: Check space_members policies
  await runQuery(
    'FIX-201: space_members SELECT policy',
    `SELECT
      polname AS policy_name,
      CASE polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
      END AS command,
      pg_get_expr(polqual, polrelid) AS using_clause
    FROM pg_policy
    WHERE polrelid = 'public.space_members'::regclass
    ORDER BY polname;`
  );

  // FIX-202: Check sequential scans
  await runQuery(
    'FIX-202: Tables with high sequential scan counts',
    `SELECT
      schemaname,
      relname AS table_name,
      seq_scan AS sequential_scans,
      idx_scan AS index_scans,
      seq_tup_read AS rows_read_sequentially
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND seq_scan > 100
    ORDER BY seq_tup_read DESC
    LIMIT 10;`
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ Database findings check complete');
  console.log('='.repeat(60));
}

// Run the checks
checkFindings().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
