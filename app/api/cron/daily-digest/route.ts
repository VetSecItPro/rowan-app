import { NextRequest, NextResponse } from 'next/server';
import { dailyDigestService } from '@/lib/services/daily-digest-service';
import * as Sentry from '@sentry/nextjs';

/**
 * POST /api/cron/daily-digest
 *
 * Cron job that runs at 12:00 PM UTC (7:00 AM Eastern) every day
 * Generates and sends daily digest emails to all users with digest enabled
 *
 * This endpoint should be called by:
 * - Vercel Cron Jobs (production)
 * - Manual testing (development)
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron secret provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily digest cron job at', new Date().toISOString());

    // Generate and send daily digests
    const results = await dailyDigestService.generateAndSendDailyDigests();

    const executionTime = Date.now() - startTime;

    // Log results
    console.log('Daily digest cron job completed:', {
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    // Track success in Sentry
    Sentry.addBreadcrumb({
      message: 'Daily digest cron job completed',
      level: 'info',
      data: {
        sent: results.sent,
        failed: results.failed,
        executionTimeMs: executionTime
      }
    });

    // If any failures, log as warning but still return success
    if (results.failed > 0) {
      console.warn(`Daily digest had ${results.failed} failures:`, results.errors);

      Sentry.captureMessage(`Daily digest completed with ${results.failed} failures`, {
        level: 'warning',
        extra: {
          sent: results.sent,
          failed: results.failed,
          errors: results.errors,
          executionTimeMs: executionTime
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Daily digest completed: ${results.sent} sent, ${results.failed} failed`,
      data: {
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('Daily digest cron job failed:', error);

    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/cron/daily-digest',
        type: 'cron_job_failure'
      },
      extra: {
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: false,
      error: 'Daily digest cron job failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/daily-digest
 *
 * Health check and manual trigger for testing
 * Does not require CRON_SECRET for GET requests
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Manual trigger for testing (requires admin or development)
  if (action === 'trigger') {
    console.log('Manual trigger of daily digest requested');

    try {
      const results = await dailyDigestService.generateAndSendDailyDigests();

      return NextResponse.json({
        success: true,
        message: 'Daily digest manually triggered',
        data: results
      });
    } catch (error) {
      console.error('Manual daily digest trigger failed:', error);

      return NextResponse.json({
        success: false,
        error: 'Manual trigger failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }

  // Health check
  return NextResponse.json({
    success: true,
    message: 'Daily digest cron endpoint is healthy',
    info: {
      currentTime: new Date().toISOString(),
      nextScheduledRun: 'Daily at 12:00 PM UTC (7:00 AM Eastern)',
      endpoint: '/api/cron/daily-digest',
      methods: ['POST (cron)', 'GET (health check)']
    }
  });
}