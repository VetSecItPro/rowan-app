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

    // Get user partnerships for data cleanup
    const { data: partnerships, error: partnershipsError } = await supabase
      .from('partnership_members')
      .select('partnership_id')
      .eq('user_id', userId);

    if (partnershipsError) throw partnershipsError;

    const partnershipIds = (partnerships || []).map((p: { partnership_id: string }) => p.partnership_id);

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
        partnership_ids: partnershipIds,
      });

    if (deletionRecordError) throw deletionRecordError;

    // Cascade delete personal data across all tables
    if (partnershipIds.length > 0) {
      // Delete expenses
      await supabase.from('expenses').delete().in('partnership_id', partnershipIds);

      // Delete budgets
      await supabase.from('budgets').delete().in('partnership_id', partnershipIds);

      // Delete bills
      await supabase.from('bills').delete().in('partnership_id', partnershipIds);

      // Delete goals
      await supabase.from('goals').delete().in('partnership_id', partnershipIds);

      // Delete projects
      await supabase.from('projects').delete().in('partnership_id', partnershipIds);

      // Delete tasks
      await supabase.from('tasks').delete().in('partnership_id', partnershipIds);

      // Delete calendar events
      await supabase.from('events').delete().in('partnership_id', partnershipIds);

      // Delete reminders
      await supabase.from('reminders').delete().in('partnership_id', partnershipIds);

      // Delete messages
      await supabase.from('messages').delete().in('partnership_id', partnershipIds);

      // Delete shopping lists and items
      const { data: shoppingLists } = await supabase
        .from('shopping_lists')
        .select('id')
        .in('partnership_id', partnershipIds);

      if (shoppingLists && shoppingLists.length > 0) {
        const listIds = shoppingLists.map((l: { id: string }) => l.id);
        await supabase.from('shopping_items').delete().in('list_id', listIds);
        await supabase.from('shopping_lists').delete().in('partnership_id', partnershipIds);
      }

      // Delete meals
      await supabase.from('meals').delete().in('partnership_id', partnershipIds);

      // Delete recipes
      await supabase.from('recipes').delete().in('partnership_id', partnershipIds);
    }

    // Remove user from partnerships
    await supabase.from('partnership_members').delete().eq('user_id', userId);

    // Delete user profile
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
    .single();

  return !error && !!data;
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

// Export all functions as a service object (this was the issue before)
export const accountDeletionService = {
  deleteUserAccount,
  isAccountMarkedForDeletion,
  cancelAccountDeletion,
  logDeletionAction,
};

// Also export individual functions for convenience
export { deleteUserAccount, isAccountMarkedForDeletion, cancelAccountDeletion };