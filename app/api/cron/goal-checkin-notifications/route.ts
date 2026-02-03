import { NextRequest, NextResponse } from 'next/server';
import { processGoalCheckInNotifications } from '@/lib/jobs/goal-checkin-notifications-job';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/security/verify-secret';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

/**
 * Cron job endpoint for processing goal check-in reminder notifications
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access
 * Vercel Cron: Runs every 15 minutes
 *
 * Example vercel.json configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/goal-checkin-notifications",
 *     "schedule": "every 15 minutes"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set', undefined, {
        component: 'GoalCheckInNotificationsCron',
        action: 'verify_secret',
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!verifyCronSecret(authHeader, expectedSecret)) {
      logger.warn('Unauthorized cron request attempt', {
        component: 'GoalCheckInNotificationsCron',
        action: 'verify_auth',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process goal check-in notifications
    const result = await processGoalCheckInNotifications();

    // Log results
    logger.info('Goal check-in notification job completed', {
      component: 'GoalCheckInNotificationsCron',
      action: 'process',
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      remindersScheduled: result.remindersScheduled,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.error('Goal check-in notification job errors', undefined, {
        component: 'GoalCheckInNotificationsCron',
        action: 'process',
        errors: result.errors,
      });
    }

    return NextResponse.json({
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      remindersScheduled: result.remindersScheduled,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Goal check-in notification cron job failed', error, {
      component: 'GoalCheckInNotificationsCron',
      action: 'execute',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}