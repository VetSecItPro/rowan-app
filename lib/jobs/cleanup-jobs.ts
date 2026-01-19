/**
 * Cleanup Jobs
 *
 * Various maintenance tasks for data cleanup.
 */

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function runDailyCleanup() {
  logger.info('Running daily cleanup tasks...', { component: 'cleanup-jobs' });

  await Promise.all([
    cleanupExpiredSnoozedTasks(),
    cleanupOldQuickActionUsage(),
    cleanupOldActivityLogs(),
    autoCompleteMealPlanTasks(),
    cleanupExpiredShoppingTasks(),
  ]);

  logger.info('Daily cleanup complete', { component: 'cleanup-jobs' });
}

async function cleanupExpiredSnoozedTasks() {
  try {
    const { error } = await supabaseAdmin.rpc('auto_unsnooze_expired_tasks');
    if (error) throw error;
    logger.info('✓ Cleaned up expired snoozed tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up snoozed tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupOldQuickActionUsage() {
  try {
    const { error } = await supabaseAdmin.rpc('cleanup_old_quick_action_usage');
    if (error) throw error;
    logger.info('✓ Cleaned up old quick action usage', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up quick actions:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupOldActivityLogs() {
  try {
    const { error } = await supabaseAdmin.rpc('cleanup_old_activity_logs');
    if (error) throw error;
    logger.info('✓ Cleaned up old activity logs', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up activity logs:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function autoCompleteMealPlanTasks() {
  try {
    const { error } = await supabaseAdmin.rpc('auto_complete_meal_tasks');
    if (error) throw error;
    logger.info('✓ Auto-completed meal plan tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error auto-completing meal tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupExpiredShoppingTasks() {
  try {
    const cleanupResult = await supabaseAdmin.rpc('cleanup_expired_shopping_tasks');
    if (cleanupResult.error) throw cleanupResult.error;
    const autoCompleteResult = await supabaseAdmin.rpc('auto_complete_shopping_tasks');
    if (autoCompleteResult.error) throw autoCompleteResult.error;
    logger.info('✓ Cleaned up expired shopping tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up shopping tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

export async function refreshMaterializedViews() {
  try {
    const { error } = await supabaseAdmin.rpc('refresh_quick_action_stats');
    if (error) throw error;
    logger.info('✓ Refreshed materialized views', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error refreshing views:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}
