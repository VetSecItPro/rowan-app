import { NextRequest, NextResponse } from 'next/server';
import { processReminderNotifications } from '@/lib/jobs/reminder-notifications-job';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/security/verify-secret';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

/**
 * Cron job endpoint for processing reminder notifications
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access
 * Vercel Cron: Runs every 15 minutes
 *
 * Example vercel.json configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reminder-notifications",
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
        component: 'ReminderNotificationsCron',
        action: 'verify_secret',
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!verifyCronSecret(authHeader, expectedSecret)) {
      logger.warn('Unauthorized cron request attempt', {
        component: 'ReminderNotificationsCron',
        action: 'verify_auth',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process notifications
    const result = await processReminderNotifications();

    // Log results
    logger.info('Reminder notification job completed', {
      component: 'ReminderNotificationsCron',
      action: 'process',
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.error('Notification job errors', undefined, {
        component: 'ReminderNotificationsCron',
        action: 'process',
        errors: result.errors,
      });
    }

    return NextResponse.json({
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron job failed', error, {
      component: 'ReminderNotificationsCron',
      action: 'execute',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
