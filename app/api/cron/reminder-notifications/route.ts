import { NextRequest, NextResponse } from 'next/server';
import { processReminderNotifications } from '@/lib/jobs/reminder-notifications-job';

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
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process notifications
    const result = await processReminderNotifications();

    // Log results
    console.log('Reminder notification job completed:', {
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      console.error('Notification job errors:', result.errors);
    }

    return NextResponse.json({
      success: result.success,
      notificationsSent: result.notificationsSent,
      emailsSent: result.emailsSent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Job execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
