#!/usr/bin/env npx tsx
/**
 * Database Validation Script
 *
 * Confirms basic connectivity, then dynamically lists every table in the
 * `public` schema. Replaces the previous hardcoded list, which had drifted
 * out of sync with reality (it referenced `voice_note_templates`,
 * `activity_feed`, etc. — all dropped in the 2026-03-16 cleanup).
 *
 * Usage: pnpm validate-db
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
  process.exit(1);
}

async function checkConnectivity(): Promise<boolean> {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  const { error } = await supabase.from('spaces').select('id').limit(1);
  if (error) {
    console.log(`❌ Anon connectivity: ${error.message}`);
    return false;
  }
  console.log('✅ Anon connectivity (PostgREST + spaces): OK');
  return true;
}

async function listPublicTables(): Promise<void> {
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL not set — skipping schema introspection');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
  } catch (err) {
    console.log(`⚠️  DATABASE_URL connection failed (${(err as Error).message}); skipping schema introspection`);
    return;
  }

  try {
    const { rows } = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename`
    );
    console.log(`\n📊 public schema: ${rows.length} tables`);
    for (const row of rows) {
      console.log(`   • ${row.tablename}`);
    }

    const { rows: rlsRows } = await client.query(
      `SELECT tablename
         FROM pg_tables t
         JOIN pg_class c ON c.relname = t.tablename
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
        WHERE t.schemaname = 'public' AND c.relrowsecurity = false
        ORDER BY tablename`
    );
    if (rlsRows.length > 0) {
      console.log(`\n⚠️  ${rlsRows.length} public table(s) with RLS DISABLED:`);
      for (const r of rlsRows) console.log(`   • ${r.tablename}`);
    } else {
      console.log('\n✅ All public tables have RLS enabled');
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Database Validation\n' + '='.repeat(60));
  const ok = await checkConnectivity();
  if (!ok) process.exit(1);
  await listPublicTables();
  console.log('\n' + '='.repeat(60));
  console.log('✅ Validation complete');
}

main().catch((err) => {
  console.error('❌ Validation crashed:', err);
  process.exit(1);
});
