-- ============================================================================
-- Migration: Backfill columns missing due to first-create-wins drift
-- Date: 2026-05-07
--
-- WHY:
-- A forensic audit (scripts/ci/migration-drift-audit.mjs, run 2026-05-07)
-- found 11 tables created by 2+ migrations with column-set drift. PostgreSQL's
-- CREATE TABLE IF NOT EXISTS makes the first migration win — subsequent
-- ones silently no-op even if their schema differs. The 9 tables below have
-- columns that exist in later migrations but never made it into CI replay
-- because no ALTER TABLE backfill was added.
--
-- Production has these columns (created via dashboard or replicated from
-- the latest migration before the older one was added). CI rebuilds from
-- migrations alone, so the latent drift only surfaces when E2E hits a
-- code path using one of the missing columns.
--
-- This migration adds idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS for
-- the columns app code actively references. Tables where the missing
-- columns are no longer used (notification_queue digest_*, chores
-- completion_percentage) are intentionally NOT backfilled — they're
-- orphan columns to retire, not gaps to fill.
--
-- IDEMPOTENT:
--   - Each ADD COLUMN uses IF NOT EXISTS — safe on prod (no-op) and on
--     fresh CI replay (creates).
--   - All columns are nullable (no NOT NULL) since existing rows have no
--     value. The original NOT NULL constraints in source migrations apply
--     to NEW rows via app-side validation.
--
-- AUDIT TRAIL:
--   Per-table source migration → backfill below:
--   • goal_check_in_settings   ← 20251017170145_apply_goal_activity_system
--   • user_privacy_preferences ← 20251019000010_privacy_data_system
--   • event_proposals          ← 20251014000004_create_event_proposals
--   • event_attachments        ← 20251014000002_create_event_attachments
--   • event_comments           ← 20251014000003_create_event_comments
--   • notifications            ← 20251017000021_create_notifications_table
-- ============================================================================

-- goal_check_in_settings — referenced by lib/services/goals/checkin-service.ts
ALTER TABLE goal_check_in_settings ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT FALSE;
ALTER TABLE goal_check_in_settings ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 0;

-- user_privacy_preferences — referenced by app/api/privacy/preferences/route.ts
ALTER TABLE user_privacy_preferences ADD COLUMN IF NOT EXISTS activity_status_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE user_privacy_preferences ADD COLUMN IF NOT EXISTS share_anonymous_analytics BOOLEAN DEFAULT FALSE;
ALTER TABLE user_privacy_preferences ADD COLUMN IF NOT EXISTS third_party_analytics_enabled BOOLEAN DEFAULT FALSE;

-- event_proposals — referenced by lib/services/event-proposals-service.ts
-- Note: original CHECK constraint on category not re-applied (would require
-- validating existing rows). App-side Zod validation enforces enum.
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS location TEXT;

-- event_attachments — used by event commenting/file-share flow
ALTER TABLE event_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE event_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE event_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- event_comments — used by event-commenting flow
ALTER TABLE event_comments ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;

-- notifications — single missing column, low impact but cheap to add
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  RAISE NOTICE '✅ First-create-wins drift backfilled: 6 tables, 12 columns';
END
$$;
