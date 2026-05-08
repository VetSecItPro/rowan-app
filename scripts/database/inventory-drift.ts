#!/usr/bin/env npx tsx
/**
 * Phase 9.1 Drift Inventory
 *
 * Read-only script that enumerates production schema objects and flags those
 * with no app code references (orphan candidates) vs those that ARE referenced
 * (kept). Output drives the Phase 9.2 reconciliation migration.
 *
 * What it inventories (public schema only, ignoring shared sm_* and automation):
 *   - Functions (custom DB functions)
 *   - Tables (with row counts)
 *   - Triggers (custom, on public + auth.users)
 *   - Indexes (non-PK, non-FK)
 *
 * For each: greps the codebase for references. Orphan = zero refs.
 *
 * Exit 0; this is informational. Output is a markdown report saved next to
 * the script.
 */

import { setDefaultResultOrder } from 'dns';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

setDefaultResultOrder('ipv4first');
config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing from .env.local');
  process.exit(1);
}
const DB_URL: string = databaseUrl;

const ROWAN_TABLE_EXCLUDE_PREFIX = ['sm_', 'spatial_ref_sys'];
const ROWAN_TABLE_EXCLUDE_SCHEMA = ['automation'];

function grepCount(pattern: string): number {
  try {
    const cmd = `grep -rE "${pattern}" --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.js" --include="*.mjs" lib/ app/ components/ hooks/ supabase/migrations/ scripts/ 2>/dev/null | wc -l | tr -d ' '`;
    return parseInt(execSync(cmd, { encoding: 'utf8' }).trim()) || 0;
  } catch {
    return 0;
  }
}

interface FunctionRow { name: string; signature: string; refs: number; policy_refs: number; trigger_refs: number; }
interface TableRow { name: string; row_count: number; refs: number; }
interface TriggerRow { schema: string; table: string; trigger: string; func: string; refs: number; }

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🔍 Phase 9.1 — Reading prod schema...\n');

  // 1. Functions in public schema, excluding ones OWNED by an extension
  // (deptype='e' AND refclassid points at pg_extension — the looser
  // "any 'e' dep" form misclassifies user-defined functions that
  // transitively reference extension types, see inventory-drift-extended.ts).
  const fnRes = await client.query(`
    SELECT
      p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass
          AND d.objid = p.oid
          AND d.deptype = 'e'
          AND d.refclassid = 'pg_extension'::regclass
      )
    ORDER BY p.proname;
  `);

  // Pre-fetch trigger usage and policy usage so we can classify orphans
  // properly. Three reference paths must be checked: (1) app code grep,
  // (2) pg_trigger.tgfoid, (3) pg_policy.qual/with_check. Missing any of
  // these caused the Phase 9.2 first-deploy failure.
  const trgUsage = await client.query(`
    SELECT p.proname AS fn, COUNT(*)::int AS n
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE NOT t.tgisinternal
    GROUP BY p.proname;
  `);
  const triggerRefMap = new Map<string, number>(trgUsage.rows.map(r => [r.fn, r.n]));

  const polUsage = await client.query(`
    SELECT proname AS fn, COUNT(*)::int AS n
    FROM (
      SELECT p.proname,
             pp.policyname,
             pp.tablename
      FROM pg_proc p
      CROSS JOIN pg_policies pp
      WHERE pp.qual::text LIKE '%' || p.proname || '%'
         OR pp.with_check::text LIKE '%' || p.proname || '%'
    ) sub
    GROUP BY proname;
  `);
  const policyRefMap = new Map<string, number>(polUsage.rows.map(r => [r.fn, r.n]));

  const functions: FunctionRow[] = fnRes.rows.map(r => ({
    name: r.name,
    signature: `${r.name}(${r.args})`,
    refs: grepCount(`\\b${r.name}\\b`),
    trigger_refs: triggerRefMap.get(r.name) ?? 0,
    policy_refs: policyRefMap.get(r.name) ?? 0,
  }));

  console.log(`  Functions in public schema: ${functions.length}`);

  // 2. Tables in public schema with row counts (skip shared)
  const tblRes = await client.query(`
    SELECT
      c.relname AS name,
      (SELECT reltuples::bigint FROM pg_class WHERE oid = c.oid) AS approx_rows
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  const tables: TableRow[] = tblRes.rows
    .filter(r => !ROWAN_TABLE_EXCLUDE_PREFIX.some(p => r.name.startsWith(p)) && r.name !== 'spatial_ref_sys')
    .map(r => ({
      name: r.name,
      row_count: Number(r.approx_rows) || 0,
      refs: grepCount(`\\.from\\('${r.name}'\\)|\\bFROM ${r.name}\\b|\\bJOIN ${r.name}\\b`),
    }));

  console.log(`  Tables in public schema (excl. shared sm_*): ${tables.length}`);

  // 3. Custom triggers on public + auth.users
  const trgRes = await client.query(`
    SELECT
      n.nspname AS schema,
      c.relname AS table_name,
      t.tgname AS trigger_name,
      p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE NOT t.tgisinternal
      AND (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))
    ORDER BY n.nspname, c.relname, t.tgname;
  `);

  const triggers: TriggerRow[] = trgRes.rows.map(r => ({
    schema: r.schema,
    table: r.table_name,
    trigger: r.trigger_name,
    func: r.function_name,
    refs: grepCount(`\\b${r.trigger_name}\\b|\\b${r.function_name}\\b`),
  }));

  console.log(`  Custom triggers (public + auth.users): ${triggers.length}\n`);

  // Categorize. A TRUE orphan must have zero refs across ALL three paths:
  // app code, triggers, and RLS policies. Missing any one of these is how
  // we mis-classified get_user_space_ids in the first 9.2 attempt — that
  // function had zero app+trigger refs but 10 policy refs.
  const fnOrphans = functions.filter(f => f.refs === 0 && f.trigger_refs === 0 && f.policy_refs === 0);
  const fnReferenced = functions.filter(f => f.refs > 0 || f.trigger_refs > 0 || f.policy_refs > 0);
  const tblOrphans = tables.filter(t => t.refs === 0);
  const tblZeroRow = tables.filter(t => t.row_count === 0);

  // Write report
  const lines: string[] = [
    '# Phase 9.1 — Prod Schema Drift Inventory',
    '',
    `Generated: ${new Date().toISOString()}`,
    `DB: ${DB_URL.replace(/:\/\/[^@]*@/, '://*****@').split('?')[0]}`,
    '',
    '## Summary',
    '',
    `- Functions: ${functions.length} (${fnOrphans.length} orphan / ${fnReferenced.length} referenced)`,
    `- Tables: ${tables.length} (${tblOrphans.length} no app refs / ${tblZeroRow.length} empty)`,
    `- Custom triggers: ${triggers.length}`,
    '',
    '## Function orphans (DROP candidates — zero refs across all 3 paths)',
    '',
    '| Signature | App refs | Trigger refs | Policy refs |',
    '|---|---|---|---|',
    ...fnOrphans.map(f => `| \`${f.signature}\` | ${f.refs} | ${f.trigger_refs} | ${f.policy_refs} |`),
    '',
    '## Function referenced (KEEP — used by app, trigger, or RLS policy)',
    '',
    '| Signature | App refs | Trigger refs | Policy refs |',
    '|---|---|---|---|',
    ...fnReferenced.map(f => `| \`${f.signature}\` | ${f.refs} | ${f.trigger_refs} | ${f.policy_refs} |`),
    '',
    '## Tables with no app refs (review candidates)',
    '',
    '| Name | Approx rows |',
    '|---|---|',
    ...tblOrphans.map(t => `| \`${t.name}\` | ${t.row_count.toLocaleString()} |`),
    '',
    '## Empty tables (review whether legitimately unused)',
    '',
    '| Name | App refs |',
    '|---|---|',
    ...tblZeroRow.map(t => `| \`${t.name}\` | ${t.refs} |`),
    '',
    '## Custom triggers (with app refs count)',
    '',
    '| Schema | Table | Trigger | Function | Refs |',
    '|---|---|---|---|---|',
    ...triggers.map(t => `| ${t.schema} | ${t.table} | \`${t.trigger}\` | \`${t.func}\` | ${t.refs} |`),
    '',
  ];

  const reportPath = 'docs/security-audit/phase-9-drift-inventory.md';
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`✅ Inventory written to ${reportPath}`);
  console.log('');
  console.log(`   Function orphans: ${fnOrphans.length}`);
  console.log(`   Tables with no app refs: ${tblOrphans.length}`);
  console.log(`   Empty tables: ${tblZeroRow.length}`);

  await client.end();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
