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

**`20260509004730_squash_v3_baseline.sql`** — On 2026-05-08 the migration history was squashed into a single canonical schema baseline (188 tables, 386 indexes, 227 functions, 562 RLS policies, 185 triggers, 644 ADD CONSTRAINTs + 3 custom triggers on `auth.users`). This file is the new starting point — it mirrors prod's exact state (verified 0/0/0 drift via `inventory-drift-extended.ts`) and is generated via `pg_dump --schema-only --schema=public` augmented with `pg_get_triggerdef` for `auth.users` triggers. The 321 migrations that produced this state are preserved in git history (see `git log` before commit `c1b84952`) but no longer in this directory.

**Squash-baseline policy:** files matching the pattern `*_squash_*.sql` are detected by `.github/workflows/deploy.yml` and marked as `applied` via `supabase migration repair --status applied` BEFORE the push step. They are NOT executed against prod (per ADR-019 manual-escape-hatch pattern). They serve only the fresh CI/local replay path.

For older migration history (pre-squash), see `git log` before the merge commit of the Phase 9.3 squash PR.
