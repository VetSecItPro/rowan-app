#!/usr/bin/env npx tsx
/**
 * Cross-check: which "orphan" functions are referenced by RLS policies?
 *
 * The Phase 9.2 inventory missed this reference path. Run BEFORE attempting
 * any DROP FUNCTION migration to identify functions that look orphan from
 * code+trigger refs but are actually used in policy qual/with_check.
 */

import { setDefaultResultOrder } from 'dns';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

setDefaultResultOrder('ipv4first');
config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

const ORPHAN_CANDIDATES = [
  'get_trial_days_remaining', 'is_user_in_trial', 'record_trial_started',
  'get_admin_level', 'has_admin_permission',
  'get_personal_space_id', 'get_user_space_ids', 'is_personal_space',
  'cleanup_expired_magic_tokens', 'cleanup_expired_reset_tokens',
  'cleanup_old_monetization_logs',
  'get_goal_check_in_stats', 'get_monetization_error_summary',
  'get_unified_activity_feed',
];

async function main() {
  const client = new Client({ connectionString: databaseUrl! });
  await client.connect();

  for (const fn of ORPHAN_CANDIDATES) {
    const res = await client.query(
      `SELECT
         schemaname || '.' || tablename AS target,
         policyname,
         CASE WHEN qual::text LIKE '%' || $1 || '%' THEN 'qual'
              WHEN with_check::text LIKE '%' || $1 || '%' THEN 'with_check'
              ELSE '?' END AS where_used
       FROM pg_policies
       WHERE qual::text LIKE '%' || $1 || '%'
          OR with_check::text LIKE '%' || $1 || '%'`,
      [fn]
    );
    const verdict = res.rows.length === 0 ? '✅ no policy refs' : `❌ used by ${res.rows.length} POLICIES`;
    console.log(`  ${fn.padEnd(35)} ${verdict}`);
    for (const row of res.rows) {
      console.log(`      • ${row.target} :: ${row.policyname} (${row.where_used})`);
    }
  }

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
