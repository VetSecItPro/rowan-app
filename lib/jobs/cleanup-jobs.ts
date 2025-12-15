/**
 * Cleanup Jobs
 *
 * Various maintenance tasks for data cleanup.
 */

import { createClient } from '@/lib/supabase/client';
import { taskSnoozeService } from '@/lib/services/task-snooze-service';
import { quickActionsService } from '@/lib/services/quick-actions-service';
import { mealPlanTasksService } from '@/lib/services/meal-plan-tasks-service';
import { logger } from '@/lib/logger';

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
    await taskSnoozeService.autoUnsnoozeExpired();
    logger.info('✓ Cleaned up expired snoozed tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up snoozed tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupOldQuickActionUsage() {
  try {
    await quickActionsService.cleanupOldUsage();
    logger.info('✓ Cleaned up old quick action usage', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up quick actions:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupOldActivityLogs() {
  try {
    const supabase = createClient();
    await supabase.rpc('cleanup_old_activity_logs');
    logger.info('✓ Cleaned up old activity logs', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up activity logs:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function autoCompleteMealPlanTasks() {
  try {
    await mealPlanTasksService.autoCompleteMealTasks();
    logger.info('✓ Auto-completed meal plan tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error auto-completing meal tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

async function cleanupExpiredShoppingTasks() {
  try {
    const supabase = createClient();
    await supabase.rpc('cleanup_expired_shopping_tasks');
    await supabase.rpc('auto_complete_shopping_tasks');
    logger.info('✓ Cleaned up expired shopping tasks', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error cleaning up shopping tasks:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}

export async function refreshMaterializedViews() {
  try {
    await quickActionsService.refreshStats();
    logger.info('✓ Refreshed materialized views', { component: 'cleanup-jobs' });
  } catch (error) {
    logger.error('✗ Error refreshing views:', error, { component: 'cleanup-jobs', action: 'service_call' });
  }
}
