import { createClient } from '@/lib/supabase/client';
import { projectsService } from './budgets-service';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface BudgetAlertResult {
  shouldAlert: boolean;
  threshold?: 50 | 75 | 90;
  percentageUsed: number;
  remaining: number;
  spent: number;
  budget: number;
}

export interface BudgetThresholdConfig {
  threshold_50_enabled: boolean;
  threshold_75_enabled: boolean;
  threshold_90_enabled: boolean;
  notifications_enabled: boolean;
}

// =====================================================
// BUDGET CALCULATION
// =====================================================

/**
 * Calculate current budget usage and determine if alert should be triggered
 */
export async function checkBudgetThreshold(
  spaceId: string
): Promise<BudgetAlertResult> {
  // Get budget settings
  const budget = await projectsService.getBudget(spaceId);

  if (!budget || budget.monthly_budget === 0) {
    return {
      shouldAlert: false,
      percentageUsed: 0,
      remaining: 0,
      spent: 0,
      budget: 0,
    };
  }

  // Get budget stats (calculates spent this month)
  const stats = await projectsService.getBudgetStats(spaceId);

  const percentageUsed = (stats.spentThisMonth / stats.monthlyBudget) * 100;

  // Determine which threshold was crossed
  let thresholdCrossed: 50 | 75 | 90 | undefined;

  if (percentageUsed >= 90 && budget.threshold_90_enabled !== false) {
    thresholdCrossed = 90;
  } else if (percentageUsed >= 75 && budget.threshold_75_enabled !== false) {
    thresholdCrossed = 75;
  } else if (percentageUsed >= 50 && budget.threshold_50_enabled !== false) {
    thresholdCrossed = 50;
  }

  // Check if we should alert (don't alert if already alerted for this threshold)
  const shouldAlert =
    thresholdCrossed !== undefined &&
    budget.notifications_enabled !== false &&
    (budget.last_alert_threshold !== thresholdCrossed);

  return {
    shouldAlert,
    threshold: thresholdCrossed,
    percentageUsed,
    remaining: stats.remaining,
    spent: stats.spentThisMonth,
    budget: stats.monthlyBudget,
  };
}

/**
 * Trigger budget alert notification
 */
export async function triggerBudgetAlert(
  spaceId: string,
  alert: BudgetAlertResult
): Promise<void> {
  if (!alert.shouldAlert || !alert.threshold) return;

  const supabase = createClient();

  // Update last alert timestamp to prevent duplicate alerts
  const { error } = await supabase
    .from('budgets')
    .update({
      last_alert_sent_at: new Date().toISOString(),
      last_alert_threshold: alert.threshold,
    })
    .eq('space_id', spaceId);

  if (error) {
    logger.error('Failed to update alert timestamp:', error, { component: 'lib-budget-alerts-service', action: 'service_call' });
  }

  // Get budget for notification preferences
  const budget = await projectsService.getBudget(spaceId);

  if (!budget) return;

  const prefs = budget.notification_preferences || { toast: true };

  // Show toast notification (default enabled)
  if (prefs.toast !== false) {
    const emoji = alert.threshold === 90 ? '🚨' : alert.threshold === 75 ? '⚠️' : '💡';

    toast.warning(
      `${emoji} Budget Alert: ${alert.threshold}% Spent`,
      {
        description: `You've spent $${alert.spent.toLocaleString()} of your $${alert.budget.toLocaleString()} monthly budget. ${
          alert.remaining >= 0
            ? `$${alert.remaining.toLocaleString()} remaining.`
            : `Over budget by $${Math.abs(alert.remaining).toLocaleString()}!`
        }`,
        duration: 5000,
      }
    );
  }

  // TODO: Send email notification if enabled (requires Resend integration)
  // TODO: Send push notification if enabled (requires web push setup)
}

/**
 * Check budget after expense is created/updated
 * Call this function after creating or updating an expense
 */
export async function checkBudgetAfterExpenseChange(
  spaceId: string
): Promise<void> {
  const alert = await checkBudgetThreshold(spaceId);

  if (alert.shouldAlert) {
    await triggerBudgetAlert(spaceId, alert);
  }
}

/**
 * Get "safe to spend" status and amount
 */
export async function getSafeToSpendInfo(spaceId: string): Promise<{
  safeToSpend: number;
  status: 'safe' | 'warning' | 'danger' | 'over';
  percentageUsed: number;
  daysLeftInMonth: number;
  dailyBudget: number;
}> {
  const stats = await projectsService.getBudgetStats(spaceId);

  const percentageUsed = stats.monthlyBudget > 0
    ? (stats.spentThisMonth / stats.monthlyBudget) * 100
    : 0;

  // Calculate days left in month
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeftInMonth = Math.max(
    1,
    Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate safe daily budget based on remaining
  const dailyBudget = Math.max(0, stats.remaining / daysLeftInMonth);

  // Determine status
  let status: 'safe' | 'warning' | 'danger' | 'over';
  if (stats.remaining < 0) {
    status = 'over';
  } else if (percentageUsed >= 90) {
    status = 'danger';
  } else if (percentageUsed >= 75) {
    status = 'warning';
  } else {
    status = 'safe';
  }

  return {
    // When over budget, return the absolute value of how much over
    safeToSpend: status === 'over' ? Math.abs(stats.remaining) : stats.remaining,
    status,
    percentageUsed,
    daysLeftInMonth,
    dailyBudget,
  };
}

/**
 * Reset monthly alert tracking (call this at start of each month)
 */
export async function resetMonthlyAlerts(spaceId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('budgets')
    .update({
      last_alert_sent_at: null,
      last_alert_threshold: null,
    })
    .eq('space_id', spaceId);
}

/** Aggregated service for budget threshold alerts, safe-to-spend calculations, and monthly resets. */
export const budgetAlertsService = {
  checkBudgetThreshold,
  triggerBudgetAlert,
  checkBudgetAfterExpenseChange,
  getSafeToSpendInfo,
  resetMonthlyAlerts,
};
