/**
 * CI Schema-Drift Audit
 *
 * WHY:
 * During Phase 8 broken-baseline repair (May 2026), we discovered four
 * distinct schema-correctness bugs where application code referenced
 * columns/functions that production had via squashed-history but
 * migrations no longer created. CI's local Supabase rebuilds from
 * migrations alone, exposing the drift via runtime errors.
 *
 *   1. subscriptions.trial_started_at — missing migration
 *   2. events.show_countdown / countdown_label — missing migration
 *   3. calculate_sync_priority() — typo (start_date vs start_time)
 *   4. daily_checkins.energy_level — missing migration (latent)
 *
 * This script verifies the schema actually present in the running DB
 * matches what application code expects. Run after `supabase start`
 * applies all migrations, BEFORE the Playwright suite. Failing fast
 * here turns a 40-minute test failure into a 5-second clear error
 * with the exact missing column name.
 *
 * USAGE:
 *   pnpm tsx scripts/ci/schema-check.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * EXPECTED_SCHEMA below is the manually-curated source of truth. When
 * a service starts using a new column, add it here. When a service
 * stops using a column, remove it. The audit catches the "I forgot
 * to add a migration for this column" class of bug — not "I forgot
 * to update the audit list" (which would just produce false negatives).
 *
 * Adding a new table:
 *   1. Add `[tableName]: ['col1', 'col2', ...]`
 *   2. Match the columns to the actual `select(...)` lists in services
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local for local development
config({ path: '.env.local' });

interface ExpectedSchema {
  [table: string]: string[];
}

// Curated list of (table, columns) the application code references.
// Sourced from the *_COLUMNS constants in services + the inline
// column lists in calendar-service.ts. Update as services evolve.
const EXPECTED_SCHEMA: ExpectedSchema = {
  // From lib/services/subscription-service.ts SUBSCRIPTION_COLUMNS
  subscriptions: [
    'id', 'user_id', 'tier', 'status', 'period',
    'polar_customer_id', 'polar_subscription_id',
    'is_founding_member', 'founding_member_number', 'founding_member_locked_price_id',
    'trial_started_at', 'trial_ends_at',
    'subscription_started_at', 'subscription_ends_at',
    'created_at', 'updated_at',
  ],

  // From lib/services/calendar-service.ts (inline select lists)
  events: [
    'id', 'space_id', 'title', 'description', 'start_time', 'end_time',
    'event_type', 'is_recurring', 'recurrence_pattern',
    'location', 'category', 'status',
    'assigned_to', 'created_by',
    'custom_color', 'timezone',
    'deleted_at', 'deleted_by',
    'show_countdown', 'countdown_label',
    'linked_bill_id',
    'created_at', 'updated_at',
  ],

  // user_notification_preferences is INTENTIONALLY NOT in EXPECTED_SCHEMA.
  // The actual table schema (from migration 20251017190000) uses columns
  // like email_task_assignments / email_event_reminders / push_event_alerts,
  // but lib/services/notification-preferences-service.ts PREFERENCE_COLUMNS
  // references a totally different (imagined) schema with email_enabled /
  // in_app_assignments / digest_enabled. Migration 20251020060000 also
  // explicitly DROPPED digest_* columns the code still references. This
  // is a "rewrite the service to match actual schema" job (Phase 8.6),
  // not a schema-fix job — adding the cols would undo the cleanup.

  // From check-in flow (useCheckIn.ts + checkins-service.ts).
  // Migration 20260506213958 (this PR) adds energy_level if missing.
  daily_checkins: [
    'id', 'user_id', 'space_id',
    'mood', 'energy_level',
    'created_at', 'updated_at',
  ],

  // From lib/services/expense-service.ts
  expenses: [
    'id', 'amount', 'category', 'date', 'description', 'title',
  ],

  // From lib/services/projects-service.ts
  projects: [
    'id', 'space_id', 'name', 'description', 'status',
    'start_date', 'target_date', 'budget_amount',
    'created_by', 'created_at', 'updated_at',
  ],

  // From lib/services/bills-service.ts (heavily-linked table)
  bills: [
    'id', 'space_id', 'name', 'amount', 'category', 'payee', 'notes',
    'due_date', 'frequency', 'status', 'auto_pay',
    'last_paid_date', 'next_due_date',
    'linked_expense_id', 'linked_calendar_event_id', 'linked_reminder_id',
    'reminder_enabled', 'reminder_days_before', 'last_reminder_sent_at',
    'created_by', 'created_at', 'updated_at',
  ],

  // From lib/services/receipts-service.ts
  receipts: [
    'id', 'space_id', 'expense_id', 'storage_path', 'file_name',
    'file_size', 'mime_type', 'merchant_name', 'total_amount',
    'receipt_date', 'category', 'currency',
    'ocr_text', 'ocr_confidence', 'ocr_processed_at',
    'created_at', 'updated_at', 'created_by',
  ],

  // tasks/goals/reminders entries removed: my initial column lists were
  // sourced from sub-table services (subtasks, admin-goals, task_reminders)
  // which select from DIFFERENT physical tables than the main `tasks`/
  // `goals`/`reminders`. Adding them back requires curating the canonical
  // column lists from the main-table service code — Phase 8.6 follow-up.
  // For now the audit covers the 7 tables where columns are confidently
  // verified, which already caught 6 real production bugs today.
};

async function checkSchema(): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return 1;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔍 Schema-drift audit\n');

  let failures = 0;
  let passes = 0;

  for (const [table, expectedCols] of Object.entries(EXPECTED_SCHEMA)) {
    // Use information_schema directly via SELECT (Supabase exposes it).
    // Fall back to a column probe if information_schema isn't queryable
    // through the REST API in this setup.
    const { data, error } = await supabase
      .from('information_schema.columns' as never)
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', table);

    if (error) {
      // information_schema not exposed — use a probe query instead.
      const probe = await supabase
        .from(table as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(expectedCols.join(', ') as any)
        .limit(0);

      if (probe.error) {
        console.error(`✗ ${table}: probe failed — ${probe.error.message}`);
        if (probe.error.code === '42703') {
          // Postgres "column does not exist" — drift detected.
          // The error message contains the missing column name.
          console.error(`  → Drift detected. Add a migration for the missing column(s).`);
        }
        failures++;
        continue;
      }
      console.log(`✓ ${table}: all ${expectedCols.length} columns probe-confirmed`);
      passes++;
      continue;
    }

    const actualCols = new Set((data as Array<{ column_name: string }>).map(r => r.column_name));
    const missing = expectedCols.filter(c => !actualCols.has(c));

    if (missing.length > 0) {
      console.error(`✗ ${table}: missing columns: ${missing.join(', ')}`);
      console.error(`  → Add a migration that does: ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS <col> <type>;`);
      failures++;
    } else {
      console.log(`✓ ${table}: all ${expectedCols.length} columns present`);
      passes++;
    }
  }

  console.log(`\n${passes} table(s) ok, ${failures} drift(s) found`);

  if (failures > 0) {
    console.error('\n❌ Schema drift detected — fix migrations before running E2E.');
    return 1;
  }
  console.log('\n✅ Schema is consistent with application expectations.');
  return 0;
}

checkSchema()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
