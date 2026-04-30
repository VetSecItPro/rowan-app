# Database Migrations

This directory holds the canonical record of every schema change applied to the Rowan Supabase project. Migrations are timestamp-ordered SQL files (`<YYYYMMDDHHMMSS>_<description>.sql`) and run forward-only via `supabase db push --linked` from CI.

## Policy

**1. Migration files are the source of truth, not the live DB.**

If you need a schema change, write a migration. Don't change the live DB through the dashboard, `psql`, or any one-off script and "fix the migration later" — that's how drift starts.

**1a. Every migration MUST have a unique 14-digit timestamp prefix.**

Format: `YYYYMMDDHHMMSS_descriptive_name.sql`. Same-prefix files are forbidden — they cause Postgres PK constraint violations on `supabase_migrations.schema_migrations` and corrupt deploys. Shorter (8-digit) or differently-formatted prefixes are forbidden too. The deploy workflow validates this on every push and fails fast if violated. See ADR 0018.

**1b. Every migration MUST be idempotent.**

Use `IF NOT EXISTS`, `IF EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, etc. This makes migrations safe to re-run if the live DB and metadata table ever diverge — and lets you recover from drift via `psql -f path/to/migration.sql` without breaking anything. See ADR 0020 for the recovery methodology.

**1c. Don't use `migration repair --status applied` proactively.**

The deploy workflow used to mark all local versions as applied before pushing — that was the root cause of "ghost migrations" (metadata recorded, SQL never ran). Use `migration repair` only as a manual escape hatch when a specific known-applied migration needs its metadata synced. See ADR 0019.

**2. Drift is detected automatically.**

After every deploy (and on `workflow_dispatch`), `.github/workflows/deploy.yml` runs the `drift-check` job, which executes `pnpm check-db-advisors` against the live DB. The check verifies a curated set of invariants (RLS policy form, security advisor findings, extension state). If the live DB diverges from what migrations specify, CI surfaces a warning and the job fails.

**3. Some PostGIS-related operations silently no-op.**

PostGIS objects (`spatial_ref_sys`, etc.) are owned by `supabase_admin`. The migration role (`postgres`) cannot REVOKE or modify privileges granted by `supabase_admin`. A migration with `REVOKE ... ON public.spatial_ref_sys ... FROM anon` will run without error but make zero changes. If you need to modify PostGIS state, do it via the Supabase dashboard's database linter "Fix" button, or open a support ticket. (The cleanest fix in most cases: drop PostGIS entirely if you don't use it — see migration `20260426000002_drop_postgis.sql`.)

## Local drift detection

To check your dev DB against migrations:

```bash
pnpm check-db-advisors
```

`scripts/database/check-db-advisors.ts` connects via `DATABASE_URL` from `.env.local` and reports every invariant. Exit code 0 = clean; non-zero = drift detected. To check the table inventory:

```bash
pnpm validate-db
```

Both scripts are read-only.

## Adding a new invariant to the drift check

When you ship a migration that establishes a new schema-level invariant (e.g., a new RLS policy form, a new RESTRICTIVE policy, an extension that should NOT be present), add a corresponding check function to `scripts/database/check-db-advisors.ts`. This keeps the drift detector in sync with reality. A migration without a corresponding invariant check is fine; an invariant check without a migration is a drift bug waiting to be detected.

## History

- `20260426000001_drop_location_tracking.sql` — Removed family location tracking feature (4 tables). See top-level CLAUDE.md "Feature Removal Log."
- `20260426000002_drop_postgis.sql` — Dropped PostGIS extension (was unused, only existed for the removed location feature). Eliminated the unfixable `spatial_ref_sys` security advisor finding.
- `20260328120000_fix_security_advisor_findings.sql` — Resolved 9 Supabase security advisor findings via subselect-form RLS, RESTRICTIVE service-role policies, and extension grants. (The REVOKE/GRANT lines targeting spatial_ref_sys in this migration were silent no-ops; superseded by the PostGIS drop above.)

For older migration history, see `git log -- supabase/migrations/`.
