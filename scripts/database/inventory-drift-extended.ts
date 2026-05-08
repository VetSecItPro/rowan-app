#!/usr/bin/env npx tsx
/**
 * Phase 9.1.5 Extended Drift Inventory
 *
 * Extends the function-orphan check (`inventory-drift.ts`) with two
 * additional drift classes that matter for the migration squash retry:
 *
 *   1. LOCAL_ONLY functions — defined in a migration file but absent from
 *      prod. CI replay would create them; prod doesn't have them. Either
 *      the migration was bypassed in prod, or a later migration dropped
 *      the function and the squash needs to reflect that.
 *
 *   2. MISMATCH functions — present in both, but the body in the latest
 *      migration's CREATE OR REPLACE differs from prod's pg_get_functiondef.
 *      Postgres last-wins semantics mean the freshest migration's body
 *      should match prod; a mismatch signals (a) prod was hand-edited via
 *      dashboard, (b) a function was redefined in prod via cron/admin
 *      script that wasn't checked in, or (c) the migration was applied
 *      out of order.
 *
 * Why this matters: Phase 9.2 closed the PROD_ONLY orphan class (functions
 * in prod with no migration defining them, no app refs, no trigger refs,
 * no policy refs). LOCAL_ONLY and MISMATCH are the inverse: they would
 * cause the migration squash retry (Phase 9.3) to either fail (LOCAL_ONLY
 * tries to CREATE something already there if dropped+recreated) or freeze
 * stale function bodies into the squashed source-of-truth (MISMATCH).
 *
 * IMPORTANT: this script is heuristic — it parses CREATE FUNCTION blocks
 * with a regex and is approximate on overload signatures. Treat the output
 * as a starting list to investigate, not a final verdict.
 */

import { setDefaultResultOrder } from 'dns';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { writeFileSync } from 'fs';

setDefaultResultOrder('ipv4first');
config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}
const DB_URL: string = databaseUrl;

const MIG_DIR = 'supabase/migrations';

interface MigrationDef {
  name: string;
  bodyHash: string;
  bodyExcerpt: string;
  sourceFile: string;
  bodyLength: number;
}

// Match CREATE [OR REPLACE] FUNCTION name(args) ... AS $tag$ body $tag$
// Approximate — handles common cases including multi-line bodies AND both
// PG orderings: AS-before-LANGUAGE (typical hand-written) and LANGUAGE-
// before-AS (what pg_get_functiondef emits, used by Phase 9.3 path B).
// Captures:
//   1. function name (no schema)
//   2. body (between any matching $tag$...$tag$, OR a quoted ' ... ')
const FN_DECL_RE = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_]+)\s*\([^)]*\)[\s\S]*?AS\s+(\$\w*\$[\s\S]*?\$\w*\$|'(?:[^']|'')*')/gi;

function normalize(s: string): string {
  // Strip the wrapping dollar-quote tag — both `$$...$$` and `$function$...$function$`
  // (and any other tag form Postgres might produce). What's between the tags
  // is the FUNCTION BODY, which is what we actually want to compare.
  // Order matters: tagged form first (longer), then bare $$.
  const taggedMatch = s.match(/^\s*\$([a-zA-Z_]*)\$([\s\S]*)\$\1\$\s*$/);
  let body = taggedMatch ? taggedMatch[2] : s;
  // For the single-quoted variant ('...'), strip the quotes
  if (body.startsWith("'") && body.endsWith("'")) {
    body = body.slice(1, -1).replace(/''/g, "'");
  }
  return body
    .replace(/--[^\n]*\n/g, '\n')      // strip line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // strip block comments
    .replace(/\s+/g, ' ')               // collapse whitespace
    .trim()
    .toLowerCase();
}

async function djb2(s: string): Promise<string> {
  // Quick + deterministic hash without crypto module overhead
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}

async function main() {
  // -------- 1. Parse all migration files for CREATE FUNCTION blocks --------
  const sqlFiles = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();
  const migrationDefs = new Map<string, MigrationDef>(); // last-wins (latest migration)

  for (const f of sqlFiles) {
    const content = readFileSync(join(MIG_DIR, f), 'utf8');
    let m: RegExpExecArray | null;
    while ((m = FN_DECL_RE.exec(content)) !== null) {
      const name = m[1].toLowerCase();
      const body = m[2];
      const norm = normalize(body);
      const hash = await djb2(norm);
      // Last-wins: a later migration's CREATE OR REPLACE supersedes an earlier one.
      migrationDefs.set(name, {
        name,
        bodyHash: hash,
        bodyExcerpt: body.slice(0, 200).replace(/\n/g, ' '),
        sourceFile: f,
        bodyLength: body.length,
      });
    }
  }

  // Also handle DROP FUNCTION — if the latest migration drops a function,
  // it should NOT be considered defined-in-migrations.
  for (const f of sqlFiles) {
    const content = readFileSync(join(MIG_DIR, f), 'utf8');
    const drops = content.matchAll(/DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_]+)/gi);
    for (const d of drops) {
      const dropName = d[1].toLowerCase();
      const existing = migrationDefs.get(dropName);
      // Only honor the drop if it comes AFTER the latest CREATE (by file sort order)
      if (existing && f > existing.sourceFile) {
        migrationDefs.delete(dropName);
      }
    }
  }

  console.log(`📂 Parsed ${sqlFiles.length} migration files`);
  console.log(`   ${migrationDefs.size} unique functions defined (after applying drops)\n`);

  // -------- 2. Get prod functions + bodies --------
  // Filter out functions OWNED by an extension (pg_depend.deptype='e' with
  // refclassid pointing at pg_extension specifically, NOT just any 'e'
  // dependency — the looser form excluded user-defined functions that
  // transitively reference extension types/classes, producing false
  // LOCAL_ONLY reports for functions like record_task_snooze that have
  // a pg_depend row through a vault.secrets type reference).
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const fnRes = await client.query(`
    SELECT
      p.proname AS name,
      pg_get_functiondef(p.oid) AS body,
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
  await client.end();

  interface ProdFn { name: string; bodyHash: string; bodyExcerpt: string; args: string; }
  const prodFns = new Map<string, ProdFn>();
  for (const r of fnRes.rows) {
    // Extract just the AS $function$ ... $function$ block from pg_get_functiondef.
    // Postgres 14+ puts LANGUAGE BEFORE the body, so match on AS-followed-by-tagged-string
    // anchored at end-of-string instead of expecting LANGUAGE after.
    const match = r.body.match(/AS\s+(\$\w*\$[\s\S]*?\$\w*\$|'(?:[^']|'')*')\s*$/);
    const bodyText = match ? match[1] : r.body;
    const norm = normalize(bodyText);
    prodFns.set(r.name, {
      name: r.name,
      bodyHash: await djb2(norm),
      bodyExcerpt: bodyText.slice(0, 200).replace(/\n/g, ' '),
      args: r.args,
    });
  }

  console.log(`🗄️  Prod has ${prodFns.size} public-schema functions\n`);

  // -------- 3. Categorize --------
  const localOnly: MigrationDef[] = [];
  const mismatches: { name: string; mig: MigrationDef; prod: ProdFn }[] = [];
  const matches: string[] = [];

  for (const [name, mig] of migrationDefs.entries()) {
    const prod = prodFns.get(name);
    if (!prod) {
      localOnly.push(mig);
    } else if (prod.bodyHash !== mig.bodyHash) {
      mismatches.push({ name, mig, prod });
    } else {
      matches.push(name);
    }
  }

  // -------- 4. Report --------
  console.log('═══ DRIFT REPORT ═══');
  console.log(`  Bodies match:  ${matches.length}`);
  console.log(`  LOCAL_ONLY:    ${localOnly.length}  (in migrations, not in prod)`);
  console.log(`  MISMATCH:      ${mismatches.length}  (in both, body differs)`);
  console.log('');

  const lines: string[] = [
    '# Phase 9.1.5 — Extended Drift Inventory (LOCAL_ONLY + MISMATCH)',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Functions defined in migrations: ${migrationDefs.size}`,
    `- Functions in prod (public): ${prodFns.size}`,
    `- Bodies match between migration + prod: ${matches.length}`,
    `- **LOCAL_ONLY**: ${localOnly.length}  (defined in migration, missing from prod)`,
    `- **MISMATCH**: ${mismatches.length}  (in both, body differs)`,
    '',
    '## LOCAL_ONLY — defined in migration, missing from prod',
    '',
    'These functions would be created by CI replay but are absent from prod.',
    'Either prod skipped the migration, or a later migration dropped the',
    'function and the latest CREATE block is no longer the truth. Review each',
    'one — squash 9.3 should either restore them or formalize the drop.',
    '',
    '| Function | Source migration | Body excerpt |',
    '|---|---|---|',
    ...localOnly.map(d => `| \`${d.name}\` | \`${d.sourceFile}\` | \`${d.bodyExcerpt.slice(0, 120)}...\` |`),
    '',
    '## MISMATCH — in both, body differs',
    '',
    'Prod\'s function body differs from the latest CREATE OR REPLACE in the',
    'migration files. Either prod was hand-edited or a migration was applied',
    'out of order. Squash 9.3 must reconcile by either:',
    '(a) updating the source migration to match prod, OR',
    '(b) writing a new CREATE OR REPLACE migration with the intended body.',
    '',
    '| Function | Migration source | Migration body excerpt | Prod body excerpt |',
    '|---|---|---|---|',
    ...mismatches.map(m =>
      `| \`${m.name}\` | \`${m.mig.sourceFile}\` | \`${m.mig.bodyExcerpt.slice(0, 80)}...\` | \`${m.prod.bodyExcerpt.slice(0, 80)}...\` |`
    ),
    '',
    '## Bodies match (informational — these are clean)',
    '',
    `${matches.length} functions: \`${matches.sort().slice(0, 30).join('`, `')}\`${matches.length > 30 ? `, ... (and ${matches.length - 30} more)` : ''}`,
    '',
  ];

  const reportPath = 'docs/security-audit/phase-9-1-5-extended-drift.md';
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`✅ Report written to ${reportPath}`);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
