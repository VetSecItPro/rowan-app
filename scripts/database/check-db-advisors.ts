#!/usr/bin/env npx tsx
/**
 * Database Advisor Check
 *
 * Verifies that the live Supabase schema matches the invariants asserted by
 * `supabase/migrations/20260328120000_fix_security_advisor_findings.sql`.
 *
 * Invariants checked:
 *   1. All "Service role only" / "Service role full access" policies use the
 *      `(SELECT auth.role())` subselect form, not bare `auth.role()`. This is
 *      the Supabase initplan optimization that the security advisor flags.
 *   2. The `user_feedback` "Service role full access" policy is RESTRICTIVE,
 *      not PERMISSIVE — fixes the "multiple permissive policies" advisor.
 *   3. PostGIS is NOT installed (dropped 2026-04-26 in migration
 *      20260426000002_drop_postgis.sql — feature was unused, only existed
 *      to support family location tracking which has been removed).
 *
 * Exit code 0 = all invariants hold (no drift). Non-zero = drift detected.
 */

import { setDefaultResultOrder } from 'dns';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// GitHub Actions runners are IPv4-only; Supabase pooler hostnames resolve
// to IPv6 first, causing ENETUNREACH 2600:1f18:... NODE_OPTIONS via env
// var doesn't reach pg's connection logic, so set programmatically here
// before the Client is created.
setDefaultResultOrder('ipv4first');

config({ path: resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing from .env.local');
  process.exit(1);
}

interface Finding {
  invariant: string;
  ok: boolean;
  detail: string;
}

const findings: Finding[] = [];

async function checkServiceRoleSubselect(client: Client): Promise<void> {
  const expectedTables = [
    { schema: 'automation', table: 'workflow_logs' },
    { schema: 'automation', table: 'reddit_monitoring' },
    { schema: 'automation', table: 'subreddit_config' },
    { schema: 'automation', table: 'product_context' },
    { schema: 'public', table: 'sm_leads' },
    { schema: 'public', table: 'sm_activities' },
    { schema: 'public', table: 'sm_deals' },
    { schema: 'public', table: 'sm_proposals' },
    { schema: 'public', table: 'site_visits' },
  ];

  for (const { schema, table } of expectedTables) {
    const { rows } = await client.query(
      `SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
         FROM pg_policy
         JOIN pg_class ON pg_class.oid = polrelid
         JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = $1 AND pg_class.relname = $2`,
      [schema, table]
    );

    if (rows.length === 0) {
      findings.push({
        invariant: `${schema}.${table} has a service-role policy`,
        ok: false,
        detail: 'No policy found — RLS may not be enabled or policy missing',
      });
      continue;
    }

    for (const row of rows) {
      const expr: string = row.using_expr ?? '';
      const usesSubselect = /\(\s*SELECT\s+auth\.role\(\)/i.test(expr);
      const occurrences = (expr.match(/auth\.role\(\)/gi) ?? []).length;
      const subselectOccurrences = (expr.match(/SELECT\s+auth\.role\(\)/gi) ?? []).length;
      const hasBare = occurrences > subselectOccurrences;
      findings.push({
        invariant: `${schema}.${table}.${row.polname} uses (SELECT auth.role())`,
        ok: usesSubselect && !hasBare,
        detail: expr,
      });
    }
  }
}

async function checkPostgisRemoved(client: Client): Promise<void> {
  const { rows: ext } = await client.query(
    `SELECT extname FROM pg_extension WHERE extname = 'postgis'`
  );
  findings.push({
    invariant: 'PostGIS extension is NOT installed',
    ok: ext.length === 0,
    detail: ext.length === 0 ? 'extension absent (as expected)' : 'postgis extension is still present',
  });

  const { rows: srs } = await client.query(
    `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys'`
  );
  findings.push({
    invariant: 'public.spatial_ref_sys does NOT exist',
    ok: srs.length === 0,
    detail: srs.length === 0 ? 'table absent (as expected)' : 'spatial_ref_sys still present',
  });
}

async function checkUserFeedbackRestrictive(client: Client): Promise<void> {
  const { rows } = await client.query(
    `SELECT polname, polpermissive, pg_get_expr(polqual, polrelid) AS using_expr
       FROM pg_policy
       JOIN pg_class ON pg_class.oid = polrelid
       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_class.relname = 'user_feedback'
        AND polname = 'Service role full access'`
  );

  if (rows.length === 0) {
    findings.push({
      invariant: 'user_feedback has "Service role full access" policy',
      ok: false,
      detail: 'Policy not found',
    });
    return;
  }

  findings.push({
    invariant: 'user_feedback "Service role full access" is RESTRICTIVE',
    ok: rows[0].polpermissive === false,
    detail: `polpermissive=${rows[0].polpermissive}`,
  });
}

async function checkTierCheckExcludesPro(client: Client): Promise<void> {
  // Contract migration 20260604140000 dropped legacy 'pro' from the
  // subscriptions tier CHECK. If 'pro' reappears in the constraint definition,
  // the expand migration was re-applied or someone widened it by hand — drift.
  const { rows } = await client.query(
    `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conname = 'subscriptions_tier_check'`
  );

  if (rows.length === 0) {
    findings.push({
      invariant: 'subscriptions_tier_check exists',
      ok: false,
      detail: 'constraint not found — tier values are unconstrained',
    });
    return;
  }

  const def: string = rows[0].def ?? '';
  findings.push({
    invariant: "subscriptions_tier_check excludes legacy 'pro'",
    ok: !/'pro'/.test(def),
    detail: def,
  });
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('🔍 Checking database advisor invariants...\n');

  try {
    await checkServiceRoleSubselect(client);
    await checkPostgisRemoved(client);
    await checkUserFeedbackRestrictive(client);
    await checkTierCheckExcludesPro(client);
  } finally {
    await client.end();
  }

  let failures = 0;
  for (const f of findings) {
    const icon = f.ok ? '✅' : '❌';
    console.log(`${icon} ${f.invariant}`);
    if (!f.ok) {
      console.log(`   detail: ${f.detail}`);
      failures += 1;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Result: ${findings.length - failures}/${findings.length} invariants hold`);

  if (failures > 0) {
    console.log(`❌ ${failures} drift(s) detected — live schema does not match migrations.`);
    process.exit(1);
  }
  console.log('✅ No drift detected — live schema matches migrations.');
}

main().catch((err) => {
  console.error('❌ Advisor check crashed:', err);
  process.exit(1);
});
