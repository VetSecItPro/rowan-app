import { NextResponse } from 'next/server';
import { generateRecurringTasks } from '@/lib/jobs/task-recurrence-job';
import { processTaskReminders } from '@/lib/jobs/task-reminders-job';
import { runDailyCleanup, refreshMaterializedViews } from '@/lib/jobs/cleanup-jobs';
import { processChoreRotations } from '@/lib/jobs/chore-rotation-job';
import { logger } from '@/lib/logger';

// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

/**
 * Cron API Route for Task Background Jobs
 *
 * This endpoint should be called by Vercel Cron or external scheduler.
 * Runs various background jobs for task management.
 *
 * Schedule recommendations:
 * - Reminders: Every 5 minutes
 * - Recurring tasks: Daily at midnight
 * - Cleanup: Daily at 2am
 * - Chore rotation: Daily at midnight
 * - Materialized views: Every 6 hours
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job');
  const authHeader = request.headers.get('authorization');

  // SECURITY: Fail-closed if CRON_SECRET is not configured
  if (!process.env.CRON_SECRET) {
    logger.error('[CRON] CRON_SECRET environment variable not configured', undefined, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Verify cron secret to prevent unauthorized access
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    switch (job) {
      case 'reminders':
        const remindersResult = await processTaskReminders();
        return NextResponse.json(remindersResult);

      case 'recurring':
        const recurringResult = await generateRecurringTasks();
        return NextResponse.json(recurringResult);

      case 'cleanup':
        await runDailyCleanup();
        return NextResponse.json({ success: true, message: 'Cleanup complete' });

      case 'rotation':
        const rotationResult = await processChoreRotations();
        return NextResponse.json(rotationResult);

      case 'refresh-views':
        await refreshMaterializedViews();
        return NextResponse.json({ success: true, message: 'Views refreshed' });

      case 'all':
        // Run all jobs (useful for testing)
        const results = await Promise.all([
          processTaskReminders(),
          generateRecurringTasks(),
          processChoreRotations(),
        ]);
        return NextResponse.json({ success: true, results });

      default:
        return NextResponse.json(
          { error: 'Invalid job parameter. Use: reminders, recurring, cleanup, rotation, refresh-views, or all' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Cron job error:', error, { component: 'api-route', action: 'api_request' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Job failed', details: message }, { status: 500 });
  }
}
