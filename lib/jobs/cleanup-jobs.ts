/**
 * Cleanup Jobs
 *
 * Various maintenance tasks for data cleanup.
 */

import { createClient } from '@/lib/supabase/client';
import { taskSnoozeService } from '@/lib/services/task-snooze-service';
import { quickActionsService } from '@/lib/services/quick-actions-service';
import { mealPlanTasksService } from '@/lib/services/meal-plan-tasks-service';

export async function runDailyCleanup() {
  console.log('Running daily cleanup tasks...');

  await Promise.all([
    cleanupExpiredSnoozedTasks(),
    cleanupOldQuickActionUsage(),
    cleanupOldActivityLogs(),
    autoCompleteMealPlanTasks(),
    cleanupExpiredShoppingTasks(),
  ]);

  console.log('Daily cleanup complete');
}

async function cleanupExpiredSnoozedTasks() {
  try {
    await taskSnoozeService.autoUnsnoozeExpired();
    console.log('✓ Cleaned up expired snoozed tasks');
  } catch (error) {
    console.error('✗ Error cleaning up snoozed tasks:', error);
  }
}

async function cleanupOldQuickActionUsage() {
  try {
    await quickActionsService.cleanupOldUsage();
    console.log('✓ Cleaned up old quick action usage');
  } catch (error) {
    console.error('✗ Error cleaning up quick actions:', error);
  }
}

async function cleanupOldActivityLogs() {
  try {
    const supabase = createClient();
    await supabase.rpc('cleanup_old_activity_logs');
    console.log('✓ Cleaned up old activity logs');
  } catch (error) {
    console.error('✗ Error cleaning up activity logs:', error);
  }
}

async function autoCompleteMealPlanTasks() {
  try {
    await mealPlanTasksService.autoCompleteMealTasks();
    console.log('✓ Auto-completed meal plan tasks');
  } catch (error) {
    console.error('✗ Error auto-completing meal tasks:', error);
  }
}

async function cleanupExpiredShoppingTasks() {
  try {
    const supabase = createClient();
    await supabase.rpc('cleanup_expired_shopping_tasks');
    await supabase.rpc('auto_complete_shopping_tasks');
    console.log('✓ Cleaned up expired shopping tasks');
  } catch (error) {
    console.error('✗ Error cleaning up shopping tasks:', error);
  }
}

export async function refreshMaterializedViews() {
  try {
    await quickActionsService.refreshStats();
    console.log('✓ Refreshed materialized views');
  } catch (error) {
    console.error('✗ Error refreshing views:', error);
  }
}
