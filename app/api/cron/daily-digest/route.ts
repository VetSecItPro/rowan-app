import { NextRequest, NextResponse } from 'next/server';
import { processDailyDigest } from '@/lib/jobs/daily-digest-job';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Cron job endpoint for processing daily digest emails
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access
 * Vercel Cron: Runs every hour at minute 0
 *
 * The job itself checks each user's preferred digest time and timezone
 * and only sends emails to users whose digest time matches the current hour.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set', undefined, {
        component: 'DailyDigestCron',
        action: 'verify_secret',
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      logger.warn('Unauthorized cron request attempt', {
        component: 'DailyDigestCron',
        action: 'verify_auth',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process daily digest
    const result = await processDailyDigest();

    // Log results
    logger.info('Daily digest cron job completed', {
      component: 'DailyDigestCron',
      action: 'process',
      success: result.success,
      emailsSent: result.emailsSent,
      usersProcessed: result.usersProcessed,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.error('Daily digest job errors', undefined, {
        component: 'DailyDigestCron',
        action: 'process',
        errors: result.errors,
      });
    }

    return NextResponse.json({
      success: result.success,
      emailsSent: result.emailsSent,
      usersProcessed: result.usersProcessed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Daily digest cron job failed', error, {
      component: 'DailyDigestCron',
      action: 'execute',
    });
    return NextResponse.json(
      {
        error: 'Job execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
