#!/usr/bin/env node
/**
 * Migration Drift Audit
 *
 * Detects the "first CREATE TABLE IF NOT EXISTS wins; subsequent ones
 * silently no-op" footgun pattern that bit us 5+ times in October 2025.
 *
 * Scans supabase/migrations/ for tables created multiple times across
 * different migration files. For each duplicate, compares the column
 * sets and reports any drift (column-name differences). Then checks
 * whether subsequent ALTER TABLE ADD COLUMN IF NOT EXISTS migrations
 * backfilled the missing columns.
 *
 * USAGE:
 *   node scripts/ci/migration-drift-audit.mjs
 *
 * OUTPUT:
 *   For each drift instance:
 *     - Table name
 *     - Migration files involved (chronological)
 *     - Column delta per migration
 *     - Columns missing in CI replay (no backfill found)
 *
 * NON-ZERO EXIT:
 *   This script is informational. It does not gate CI. The known fix
 *   for any reported drift is to add an idempotent ALTER TABLE
 *   ADD COLUMN IF NOT EXISTS migration that fills the gap.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'supabase/migrations';

/**
 * Expected-orphan allow-list: column-set drift instances we've triaged and
 * decided NOT to backfill. The audit will still report drift here for
 * visibility but won't count them toward the unbackfilled total.
 *
 * Each entry is `<table>:<column>` — the column that exists in a later
 * CREATE TABLE IF NOT EXISTS block but was never backfilled because:
 *   (a) the column is referenced only on OTHER tables (phantom), OR
 *   (b) the feature using the column was retired (digest)
 *
 * To remove from this list: implement an ALTER TABLE ADD COLUMN IF NOT
 * EXISTS migration and drop the entry. To add: surface the triage decision
 * here with a why-comment.
 */
const EXPECTED_ORPHANS = new Set([
  // chores.completion_percentage — referenced only by achievement_badges
  // and recurring_goals tables (different tables). The chores column was
  // never created anywhere; the duplicate CREATE silently no-ops.
  'chores:completion_percentage',

  // notification_queue digest_* and adjacent — digest feature fully
  // retired 2026-05-07 (PRs #380 family). Columns dropped from prod;
  // migration files retain references for history.
  'notification_queue:attempts',
  'notification_queue:content',
  'notification_queue:error_message',
  'notification_queue:last_attempt',
  'notification_queue:subject',

  // user_notification_preferences digest_* and push_* — digest cron retired
  // alongside notification_queue. The push_* cols belong to a notification
  // pipeline that was rewired to user_push_subscriptions instead.
  'user_notification_preferences:digest_frequency',
  'user_notification_preferences:digest_time',
  'user_notification_preferences:email_event_reminders',
  'user_notification_preferences:email_general_reminders',
  'user_notification_preferences:email_meal_reminders',
  'user_notification_preferences:email_new_messages',
  'user_notification_preferences:email_shopping_lists',
  'user_notification_preferences:email_task_assignments',
  'user_notification_preferences:push_enabled',
  'user_notification_preferences:push_event_alerts',
  'user_notification_preferences:push_messages',
  'user_notification_preferences:push_reminders',
  'user_notification_preferences:push_shopping_updates',
  'user_notification_preferences:push_task_updates',
  'user_notification_preferences:timezone',
]);

const sqlFiles = readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();

// Map: tableName -> [{file, columns: Set<string>}]
const creates = new Map();

const createRe = /CREATE TABLE IF NOT EXISTS (?:public\.)?([a-z_]+)\s*\(([^;]*?)^\)/gms;
const alterRe = /ALTER TABLE (?:public\.)?([a-z_]+) ADD COLUMN IF NOT EXISTS ([a-z_]+)/g;

// alters: Map<table, Set<column>>
const alters = new Map();

for (const f of sqlFiles) {
  const content = readFileSync(join(DIR, f), 'utf8');

  let m;
  while ((m = createRe.exec(content)) !== null) {
    const table = m[1];
    const body = m[2];
    const cols = new Set();
    for (const line of body.split('\n')) {
      const trim = line.trim();
      if (!trim || trim.startsWith('--')) continue;
      if (/^(CONSTRAINT|PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)/i.test(trim)) continue;
      const colMatch = trim.match(/^([a-z_]+)\s+/);
      if (colMatch) cols.add(colMatch[1]);
    }
    if (!creates.has(table)) creates.set(table, []);
    creates.get(table).push({ file: f, cols });
  }

  // Reset alterRe lastIndex since createRe sharing left it dirty
  let am;
  alterRe.lastIndex = 0;
  while ((am = alterRe.exec(content)) !== null) {
    const table = am[1];
    const col = am[2];
    if (!alters.has(table)) alters.set(table, new Set());
    alters.get(table).add(col);
  }
}

let driftCount = 0;
let unbackfilled = 0;

for (const [table, instances] of [...creates.entries()].sort()) {
  if (instances.length < 2) continue;
  const sigs = new Set(instances.map(i => [...i.cols].sort().join(',')));
  if (sigs.size === 1) continue;

  driftCount++;
  console.log(`\n🚨 ${table} — ${instances.length} CREATE blocks, ${sigs.size} distinct schemas`);

  // The FIRST create wins on fresh replay. Cols only in later creates
  // are MISSING unless backfilled via ALTER TABLE ADD COLUMN.
  const firstCols = instances[0].cols;
  const allCols = new Set(instances.flatMap(i => [...i.cols]));
  const colsBackfilled = alters.get(table) ?? new Set();

  const missingRaw = [...allCols].filter(c => !firstCols.has(c) && !colsBackfilled.has(c));
  const missingInCI = missingRaw.filter(c => !EXPECTED_ORPHANS.has(`${table}:${c}`)).sort();
  const expectedOrphans = missingRaw.filter(c => EXPECTED_ORPHANS.has(`${table}:${c}`)).sort();

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    const marker = i === 0 ? '👑 (first wins)' : '';
    console.log(`  ${inst.file} ${marker}`);
    console.log(`    cols: ${[...inst.cols].sort().join(',')}`);
  }

  if (missingInCI.length) {
    unbackfilled++;
    console.log(`  ❌ MISSING in CI replay (no ALTER backfill found):`);
    console.log(`     ${missingInCI.join(', ')}`);
  } else if (expectedOrphans.length) {
    console.log(`  ✅ All actionable columns backfilled. Expected-orphans (triaged, see EXPECTED_ORPHANS comment):`);
    console.log(`     ${expectedOrphans.join(', ')}`);
  } else {
    console.log(`  ✅ All later columns backfilled via ALTER TABLE ADD COLUMN`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Drift instances: ${driftCount}`);
console.log(`Unbackfilled (latent debt): ${unbackfilled}`);
console.log(`\nAudit complete. Informational only — does not gate CI.`);
