import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { reconcilePastDueSubscriptions } from '@/lib/jobs/subscription-reconciliation-job';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/security/verify-secret';
import { withCronMonitor } from '@/lib/observability/cron-monitor';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout on larger past_due sets.
export const maxDuration = 60;

/**
 * Cron: reconcile locally-past_due subscriptions against Polar.
 *
 * Safety net for missed subscription.revoked / recovery webhooks - see
 * lib/jobs/subscription-reconciliation-job.ts. Runs daily.
 *
 * vercel.json: { "path": "/api/cron/reconcile-subscriptions", "schedule": "0 8 * * *" }
 */
export async function GET(request: NextRequest) {
  try {
    // Fail-closed if CRON_SECRET is not configured.
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set', undefined, {
        component: 'ReconcileSubscriptionsCron',
        action: 'verify_secret',
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!verifyCronSecret(authHeader, expectedSecret)) {
      logger.warn('Unauthorized cron request attempt', {
        component: 'ReconcileSubscriptionsCron',
        action: 'verify_auth',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Wrap in a Sentry cron monitor (dead-man's switch). Schedule must match
    // vercel.json: 0 8 * * * (08:00 UTC daily).
    const result = await withCronMonitor(
      'reconcile-subscriptions',
      { schedule: '0 8 * * *', maxRuntime: 5 },
      () => reconcilePastDueSubscriptions(supabaseAdmin),
    );

    logger.info('Subscription reconciliation completed', {
      component: 'ReconcileSubscriptionsCron',
      action: 'reconcile',
      ...result,
      errorCount: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      ...result,
      errorCount: result.errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Subscription reconciliation cron failed', error, {
      component: 'ReconcileSubscriptionsCron',
      action: 'execute',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
