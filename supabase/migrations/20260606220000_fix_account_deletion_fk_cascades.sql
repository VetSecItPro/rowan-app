-- Fix account deletion: make every FK to auth.users compatible with user deletion.
--
-- ROOT CAUSE (found by live prod QA, 6 June 2026): deleting a user via
-- supabase.auth.admin.deleteUser() FAILED in production for essentially any
-- active user. 19 foreign keys referencing auth.users either:
--   (a) used ON DELETE NO ACTION  → "violates foreign key constraint ... is
--       still referenced" (e.g. event_comments_user_id_fkey), OR
--   (b) used ON DELETE SET NULL on a NOT NULL column → "null value in column
--       violates not-null constraint" (reminder_activities_user_id_fkey).
-- Either way the delete aborts, so the account-deletion cron + admin delete
-- path could never finish. (The June handoff misattributed this to a `meals`
-- row; the real blockers are these auth.users FKs.)
--
-- FIX RULE (uniform + safe):
--   * NOT NULL column  → ON DELETE CASCADE   (the row IS the user's content and
--     cannot exist without them: event comments, proposal votes, reminder
--     activity). Deleting the user removes their content — correct for GDPR
--     Article 17 erasure.
--   * NULLABLE column  → ON DELETE SET NULL  (an attribution/actor reference on
--     a row owned by a space or another entity: pinned_by, deleted_by,
--     resolved_by, created_by, approved_by, ...). The row survives; only the
--     reference to the deleted user is cleared.
--
-- Verified in a rolled-back transaction: applying these 19 rebuilds lets
-- DELETE FROM auth.users succeed, cascading spaces → meals/tasks/events/etc.
-- (spaces.user_id was already ON DELETE CASCADE) and nulling attribution cols.
--
-- Idempotent: DROP ... IF EXISTS then ADD; re-running (incl. fresh CI DBs that
-- already have the corrected definition via squash) is safe.

-- ── NOT NULL ownership columns → CASCADE ────────────────────────────────────
ALTER TABLE public.event_comments DROP CONSTRAINT IF EXISTS event_comments_user_id_fkey;
ALTER TABLE public.event_comments ADD CONSTRAINT event_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.event_proposal_votes DROP CONSTRAINT IF EXISTS event_proposal_votes_user_id_fkey;
ALTER TABLE public.event_proposal_votes ADD CONSTRAINT event_proposal_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reminder_activities DROP CONSTRAINT IF EXISTS reminder_activities_user_id_fkey;
ALTER TABLE public.reminder_activities ADD CONSTRAINT reminder_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── NULLABLE attribution columns → SET NULL ─────────────────────────────────
ALTER TABLE public.account_deletion_audit_log DROP CONSTRAINT IF EXISTS account_deletion_audit_log_performed_by_fkey;
ALTER TABLE public.account_deletion_audit_log ADD CONSTRAINT account_deletion_audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_granted_by_fkey;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.calendar_sync_conflicts DROP CONSTRAINT IF EXISTS calendar_sync_conflicts_resolved_by_fkey;
ALTER TABLE public.calendar_sync_conflicts ADD CONSTRAINT calendar_sync_conflicts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.event_attachments DROP CONSTRAINT IF EXISTS event_attachments_uploaded_by_fkey;
ALTER TABLE public.event_attachments ADD CONSTRAINT event_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_deleted_by_fkey;
ALTER TABLE public.events ADD CONSTRAINT events_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.goal_dependencies DROP CONSTRAINT IF EXISTS goal_dependencies_bypassed_by_fkey;
ALTER TABLE public.goal_dependencies ADD CONSTRAINT goal_dependencies_bypassed_by_fkey FOREIGN KEY (bypassed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.goal_dependencies DROP CONSTRAINT IF EXISTS goal_dependencies_created_by_fkey;
ALTER TABLE public.goal_dependencies ADD CONSTRAINT goal_dependencies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.important_dates DROP CONSTRAINT IF EXISTS important_dates_created_by_fkey;
ALTER TABLE public.important_dates ADD CONSTRAINT important_dates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.investor_summary_tokens DROP CONSTRAINT IF EXISTS investor_summary_tokens_created_by_fkey;
ALTER TABLE public.investor_summary_tokens ADD CONSTRAINT investor_summary_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_deleted_by_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_pinned_by_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partnership_balances DROP CONSTRAINT IF EXISTS partnership_balances_user1_id_fkey;
ALTER TABLE public.partnership_balances ADD CONSTRAINT partnership_balances_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partnership_balances DROP CONSTRAINT IF EXISTS partnership_balances_user2_id_fkey;
ALTER TABLE public.partnership_balances ADD CONSTRAINT partnership_balances_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_created_by_fkey;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_approved_by_fkey;
ALTER TABLE public.reward_redemptions ADD CONSTRAINT reward_redemptions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.rewards_catalog DROP CONSTRAINT IF EXISTS rewards_catalog_created_by_fkey;
ALTER TABLE public.rewards_catalog ADD CONSTRAINT rewards_catalog_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
