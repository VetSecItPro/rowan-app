#!/usr/bin/env npx tsx
/**
 * Phase 9.3 Path B — generate "snap migrations to prod" migration body.
 *
 * For each of the 19 known MISMATCH functions, fetches prod's
 * pg_get_functiondef and emits a CREATE OR REPLACE block.
 *
 * For each of the 29 known LOCAL_ONLY functions, verifies prod truly
 * doesn't have them, then emits a DROP FUNCTION IF EXISTS ... CASCADE.
 *
 * The output is a single idempotent SQL block that the caller pastes
 * into a new migration file. Running it:
 *   • On prod: every CREATE OR REPLACE is a no-op (bodies match);
 *     every DROP IF EXISTS is a no-op (functions already absent).
 *   • On fresh CI replay: earlier migrations CREATE the LOCAL_ONLY
 *     functions, this migration DROPs them, and earlier MISMATCH
 *     bodies get replaced with prod's body. Net result: matches prod.
 *
 * The CASCADE on DROPs is necessary if any historical migration also
 * created a trigger that references a LOCAL_ONLY function — the
 * CASCADE silently drops the trigger too, matching prod-state which
 * is internally consistent (no trigger references a missing function).
 */

import { setDefaultResultOrder } from 'dns';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

setDefaultResultOrder('ipv4first');
config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing'); process.exit(1);
}

// MISMATCH list from Phase 9.1.5 inventory (+ 5 reclassified from LOCAL_ONLY
// after the generator's first run found them actually present in prod —
// the inventory regex parser missed their CREATE FUNCTION blocks due to
// unusual multi-line formatting).
const MISMATCH = [
  'assign_task_sort_order', 'log_reminder_change', 'should_send_notification',
  'increment_template_usage', 'apply_budget_template', 'calculate_expense_splits',
  'create_goal_activity', 'create_milestone_activity', 'generate_recurring_instances',
  'is_admin', 'generate_secure_share_token', 'handle_new_user_workspace_provisioning',
  'get_user_subscription_tier', 'calculate_space_storage', 'delete_oauth_tokens',
  'update_calendar_table_statistics', 'queue_calendar_sync_on_change',
  'mark_queue_item_failed', 'claim_founding_member_number',
  // Reclassified — actually exist in both prod + migrations:
  'record_task_snooze', 'mark_reminder_sent', 'record_task_handoff',
  'process_chore_rotations', 'mark_queue_item_processing',
];

// LOCAL_ONLY list from Phase 9.1.5 inventory (5 reclassified to MISMATCH above)
const LOCAL_ONLY = [
  'trigger_calculate_splits',
  'update_partnership_balance_on_settlement', 'auto_archive_old_tasks',
  'auto_archive_old_events', 'log_compliance_event',
  'initialize_user_privacy_preferences', 'update_goal_progress_from_checkin',
  'create_checkin_activity', 'update_comment_reaction_counts',
  'create_checkin_reaction_activity', 'calculate_next_checkin_date',
  'schedule_next_checkin_reminder', 'trigger_schedule_checkin_reminders',
  'mark_checkin_reminder_completed', 'create_voice_transcription_entry',
  'search_voice_transcriptions', 'calculate_next_occurrence',
  'update_habit_streaks', 'auto_generate_habit_instances',
  'update_chore_calendar_events_updated_at', 'sync_chore_to_calendar',
  'update_calendar_event_from_chore', 'verify_calendar_rls_enabled',
  'check_calendar_index_health',
];

(async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const sections: string[] = [];

  // 1. MISMATCH — fetch prod body, emit CREATE OR REPLACE
  console.log(`\n=== Fetching ${MISMATCH.length} MISMATCH bodies from prod ===\n`);
  for (const fn of MISMATCH) {
    const r = await client.query(
      `SELECT pg_get_functiondef(p.oid) AS body
       FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public' AND p.proname = $1`,
      [fn]
    );
    if (r.rows.length === 0) {
      console.log(`  ⚠️  ${fn}: NOT FOUND in prod (was MISMATCH but missing now?)`);
      continue;
    }
    if (r.rows.length > 1) {
      console.log(`  ⚠️  ${fn}: ${r.rows.length} overloads — emitting all`);
    }
    for (const row of r.rows) {
      const body = row.body as string;
      // pg_get_functiondef emits CREATE OR REPLACE FUNCTION ... — usable as-is.
      sections.push(`-- MISMATCH: ${fn}\n${body};`);
      console.log(`  ✓ ${fn}: ${body.length} bytes`);
    }
  }

  // 2. LOCAL_ONLY — verify absence, emit DROP IF EXISTS CASCADE
  console.log(`\n=== Verifying ${LOCAL_ONLY.length} LOCAL_ONLY are absent from prod ===\n`);
  const dropStmts: string[] = [];
  for (const fn of LOCAL_ONLY) {
    const r = await client.query(
      `SELECT pg_get_function_identity_arguments(p.oid) AS args
       FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public' AND p.proname = $1`,
      [fn]
    );
    if (r.rows.length > 0) {
      console.log(`  ⚠️  ${fn}: actually EXISTS in prod (was LOCAL_ONLY classification wrong?)`);
      console.log(`     (skipping — would lose prod's copy if dropped)`);
      continue;
    }
    // Function truly absent from prod. Drop without arg signature; CASCADE for trigger deps.
    dropStmts.push(`DROP FUNCTION IF EXISTS public.${fn} CASCADE;`);
    console.log(`  ✓ ${fn}: confirmed absent → drop`);
  }

  if (dropStmts.length) {
    sections.push(`-- LOCAL_ONLY drops (${dropStmts.length} functions absent from prod)\n${dropStmts.join('\n')}`);
  }

  await client.end();

  // 3. Write the migration body to a file the caller can paste in
  const out = `-- AUTO-GENERATED by scripts/database/snap-to-prod-generator.ts (Phase 9.3 path B)
-- Generated: ${new Date().toISOString()}
-- DO NOT edit manually; re-run the generator to refresh.

${sections.join('\n\n')}

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 9.3: snapped migrations source-of-truth to prod state';
END
$$;
`;

  writeFileSync('/tmp/phase-9-3-snap-body.sql', out);
  console.log(`\n✅ Migration body written to /tmp/phase-9-3-snap-body.sql (${out.length} bytes)`);
  console.log(`   MISMATCHES emitted: ${sections.filter(s => s.startsWith('-- MISMATCH')).length}`);
  console.log(`   LOCAL_ONLY drops: ${dropStmts.length}`);
})().catch(err => { console.error(err); process.exit(1); });
