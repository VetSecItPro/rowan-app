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

  const missingInCI = [...allCols].filter(c => !firstCols.has(c) && !colsBackfilled.has(c)).sort();

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
  } else {
    console.log(`  ✅ All later columns backfilled via ALTER TABLE ADD COLUMN`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Drift instances: ${driftCount}`);
console.log(`Unbackfilled (latent debt): ${unbackfilled}`);
console.log(`\nAudit complete. Informational only — does not gate CI.`);
