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

  // From lib/services/notification-preferences-service.ts PREFERENCE_COLUMNS
  user_notification_preferences: [
    'id', 'user_id', 'space_id',
    'email_enabled', 'email_due_reminders', 'email_assignments', 'email_mentions', 'email_comments',
    'in_app_enabled', 'in_app_due_reminders', 'in_app_assignments', 'in_app_mentions', 'in_app_comments',
    'push_enabled', 'push_due_reminders', 'push_assignments', 'push_mentions', 'push_comments',
    'notification_frequency',
    'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
    'digest_enabled', 'digest_time', 'digest_timezone',
    'timezone',
  ],

  // From WebServer logs in PR #361 / #362 — code references these but
  // production has them too, so add them defensively. If they break in
  // CI, this audit surfaces the drift before tests time out.
  daily_checkins: [
    'id', 'user_id', 'space_id',
    'mood', 'energy_level',
    'created_at', 'updated_at',
  ],

  // From lib/services/tasks-service.ts and related
  tasks: [
    'id', 'parent_task_id', 'title', 'description', 'status', 'priority',
    'sort_order', 'assigned_to', 'due_date', 'estimated_duration',
    'actual_duration', 'completed_at', 'completed_by', 'created_by',
    'created_at', 'updated_at',
  ],

  // From lib/services/goals-service.ts (metric goal pattern)
  goals: [
    'id', 'metric_name', 'target_value', 'current_value', 'unit',
    'deadline', 'status', 'notes', 'created_by',
    'created_at', 'updated_at',
  ],

  // From lib/services/expense-service.ts
  expenses: [
    'id', 'amount', 'category', 'date', 'description', 'title',
  ],

  // From lib/services/reminders/* (canonical select)
  reminders: [
    'id', 'task_id', 'user_id', 'remind_at', 'reminder_type',
    'offset_type', 'custom_offset_minutes', 'is_sent', 'sent_at',
    'created_by', 'created_at', 'updated_at',
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
