import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * Account Deletion Service
 *
 * Handles GDPR-compliant account deletion with the following data retention policies:
 *
 * DATA RETENTION POLICY:
 * ----------------------
 * - User data: Deleted immediately upon account deletion request
 * - Auth account: Marked for deletion and removed from auth system
 * - Deletion record: Kept for 30 days in deleted_accounts table for grace period
 * - Audit logs: Retained permanently in account_deletion_audit_log for compliance
 * - Grace period: 30 days from deletion request to permanent deletion
 *
 * PROCESS:
 * --------
 * 1. Immediate soft delete (marks account as deleted)
 * 2. Removes all personal data (expenses, budgets, tasks, etc.)
 * 3. Logs deletion action for audit trail
 * 4. Scheduled permanent deletion after 30 days via cron job
 * 5. User can cancel deletion within 30-day grace period
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Right to erasure (Article 17)
 * - Right to data portability (Article 20) - see data-export-service.ts
 * - Accountability principle (Article 5) - audit logging
 */

export interface DeletionResult {
  success: boolean;
  error?: string;
}

/**
 * Log account deletion actions for audit trail
 */
async function logDeletionAction(
  userId: string,
  action: 'initiated' | 'cancelled' | 'permanent' | 'email_sent',
  actionDetails?: Record<string, string | number | boolean | null>,
  supabase?: SupabaseClient
) {
  if (!supabase) {
    logger.error('No supabase client provided to logDeletionAction', undefined, { component: 'lib-account-deletion-service', action: 'service_call' });
    return;
  }
  const client = supabase;

  try {
    await client.from('account_deletion_audit_log').insert({
      user_id: userId,
      action,
      action_details: actionDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to log deletion action:', error, { component: 'lib-account-deletion-service', action: 'service_call' });
    // Don't throw - audit logging shouldn't block the main operation
  }
}

/**
 * Soft delete user account and cascade delete all personal data
 */
async function deleteUserAccount(userId: string, supabase: SupabaseClient): Promise<DeletionResult> {

  try {
    // Log deletion initiation
    await logDeletionAction(userId, 'initiated', {
      timestamp: new Date().toISOString(),
      method: 'user_requested'
    }, supabase);

    // Get user's spaces for data cleanup
    const { data: memberships, error: membershipsError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId);

    if (membershipsError) throw membershipsError;

    const spaceIds = (memberships || []).map((m: { space_id: string }) => m.space_id);

    // Set deletion timestamp (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Create deletion record
    const { error: deletionRecordError } = await supabase
      .from('deleted_accounts')
      .insert({
        user_id: userId,
        deletion_requested_at: new Date().toISOString(),
        permanent_deletion_at: deletionDate.toISOString(),
      });

    if (deletionRecordError) throw deletionRecordError;

    // F-040: Comprehensive cascade delete across ALL user data tables.
    // Order matters: delete child/junction rows before parent rows to
    // respect foreign key constraints.

    // ── Phase 1: User-scoped data (keyed by user_id, not space_id) ──
    // These tables reference the user directly regardless of space.

    // AI data
    await supabase.from('ai_messages').delete().eq('user_id', userId);
    await supabase.from('ai_conversations').delete().eq('user_id', userId);
    await supabase.from('ai_user_settings').delete().eq('user_id', userId);

    // Notifications & push
    await supabase.from('in_app_notifications').delete().eq('user_id', userId);
    await supabase.from('push_tokens').delete().eq('user_id', userId);
    await supabase.from('notification_preferences').delete().eq('user_id', userId);

    // User preferences & presence
    await supabase.from('user_locations').delete().eq('user_id', userId);
    await supabase.from('user_feedback').delete().eq('user_id', userId);
    await supabase.from('user_audit_log').delete().eq('user_id', userId);

    // Achievements & points
    await supabase.from('achievement_progress').delete().eq('user_id', userId);
    await supabase.from('achievement_badges').delete().eq('user_id', userId);
    await supabase.from('point_transactions').delete().eq('user_id', userId);

    // Data export requests
    await supabase.from('account_deletion_requests').delete().eq('user_id', userId);

    // ── Phase 2: Space-scoped data (keyed by space_id) ──
    if (spaceIds.length > 0) {
      // Goal child tables (must delete before goals)
      await supabase.from('goal_check_ins').delete().in('space_id', spaceIds);
      await supabase.from('goal_contributions').delete().in('space_id', spaceIds);

      // Task child tables (must delete before tasks)
      await supabase.from('task_time_entries').delete().in('space_id', spaceIds);

      // Mentions
      await supabase.from('mentions').delete().in('space_id', spaceIds);

      // Location & geofencing
      await supabase.from('geofence_events').delete().in('space_id', spaceIds);
      await supabase.from('location_sharing_settings').delete().in('space_id', spaceIds);
      await supabase.from('availability_blocks').delete().in('space_id', spaceIds);

      // Calendar integrations
      await supabase.from('calendar_connections').delete().in('space_id', spaceIds);

      // Expenses
      await supabase.from('expenses').delete().in('space_id', spaceIds);

      // Budgets
      await supabase.from('budgets').delete().in('space_id', spaceIds);

      // Bills
      await supabase.from('bills').delete().in('space_id', spaceIds);

      // Goals (after child tables)
      await supabase.from('goals').delete().in('space_id', spaceIds);

      // Projects
      await supabase.from('projects').delete().in('space_id', spaceIds);

      // Tasks (after child tables)
      await supabase.from('tasks').delete().in('space_id', spaceIds);

      // Calendar events
      await supabase.from('events').delete().in('space_id', spaceIds);

      // Reminders
      await supabase.from('reminders').delete().in('space_id', spaceIds);

      // Messages
      await supabase.from('messages').delete().in('space_id', spaceIds);

      // Shopping lists and items
      const { data: shoppingLists } = await supabase
        .from('shopping_lists')
        .select('id')
        .in('space_id', spaceIds);

      if (shoppingLists && shoppingLists.length > 0) {
        const listIds = shoppingLists.map((l: { id: string }) => l.id);
        await supabase.from('shopping_items').delete().in('list_id', listIds);
        await supabase.from('shopping_lists').delete().in('space_id', spaceIds);
      }

      // Meals & recipes
      await supabase.from('meals').delete().in('space_id', spaceIds);
      await supabase.from('recipes').delete().in('space_id', spaceIds);

      // Rewards
      await supabase.from('reward_redemptions').delete().in('space_id', spaceIds);
    }

    // ── Phase 3: Remove memberships and user record ──
    await supabase.from('space_members').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting user account:', error, { component: 'lib-account-deletion-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    };
  }
}

/**
 * Check if user account is marked for deletion
 */
async function isAccountMarkedForDeletion(userId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from('deleted_accounts')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !error && data !== null;
}

/**
 * Cancel account deletion (within 30-day grace period)
 */
async function cancelAccountDeletion(userId: string, supabase: SupabaseClient): Promise<DeletionResult> {

  try {
    // Log cancellation
    await logDeletionAction(userId, 'cancelled', {
      timestamp: new Date().toISOString(),
      method: 'user_requested'
    }, supabase);

    const { error } = await supabase
      .from('deleted_accounts')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error canceling account deletion:', error, { component: 'lib-account-deletion-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel deletion',
    };
  }
}

/** Aggregated account deletion service with all deletion-related operations. */
export const accountDeletionService = {
  deleteUserAccount,
  isAccountMarkedForDeletion,
  cancelAccountDeletion,
  logDeletionAction,
};

// Also export individual functions for convenience
export { deleteUserAccount, isAccountMarkedForDeletion, cancelAccountDeletion };