import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify Sentry integration
 * GET /api/test-sentry
 *
 * This endpoint throws an error to test if Sentry is correctly capturing errors
 */
export async function GET(req: NextRequest) {
  try {
    // Throw a test error
    throw new Error('🧪 Sentry Test Error - This is intentional for testing error tracking!');
  } catch (error) {
    // Capture the error with Sentry
    Sentry.captureException(error, {
      tags: {
        test: true,
        endpoint: '/api/test-sentry',
      },
      extra: {
        message: 'This is a test error to verify Sentry integration',
        timestamp: new Date().toISOString(),
      },
    });

    // Log to console as well
    logger.error('[TEST] Sentry test error:', error, { component: 'api-route', action: 'api_request' });

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Test error captured',
        message: 'Check your Sentry dashboard for this error!',
      },
      { status: 500 }
    );
  }
}
