/**
 * Cron monitoring (dead-man's switch) via Sentry Crons.
 *
 * A try/catch inside a cron handler can only observe runs that actually
 * execute. The dangerous failure mode is a cron that stops firing entirely -
 * a stuck Vercel deploy webhook, a schedule that silently drifts, a route that
 * 500s before any logging. Sentry cron monitors close that gap: `withMonitor`
 * sends an `in_progress` check-in when the work starts and `ok`/`error` when it
 * finishes, and registers the EXPECTED schedule so Sentry alerts when a run is
 * missed altogether.
 *
 * Phase 13.3 (ops observability). Applied to billing-adjacent + notification
 * crons - the ones whose silent failure costs money or breaks the core loop.
 */

import * as Sentry from '@sentry/nextjs';

export interface CronMonitorOptions {
  /**
   * Crontab expression that MUST match this job's vercel.json `schedule`.
   * Sentry uses it to know when a run is overdue. Keep the two in sync.
   */
  schedule: string;
  /** Minutes a run may start late before Sentry marks it missed. Default 5. */
  checkinMargin?: number;
  /** Minutes a run may take before Sentry marks it timed out. Default 10. */
  maxRuntime?: number;
}

/**
 * Wrap a cron job's work in a Sentry cron monitor.
 *
 * Only the `work` callback is bracketed by check-ins - call this AFTER the
 * auth/secret gate so unauthorized probes don't register as job runs. Returns
 * the work's return value unchanged; re-throws so the caller's error handling
 * (and the `error` check-in) both fire.
 *
 * No-op outside production (or when Sentry has no DSN) - it just runs `work`.
 */
export async function withCronMonitor<T>(
  monitorSlug: string,
  options: CronMonitorOptions,
  work: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return work();
  }

  return Sentry.withMonitor(monitorSlug, work, {
    schedule: { type: 'crontab', value: options.schedule },
    checkinMargin: options.checkinMargin ?? 5,
    maxRuntime: options.maxRuntime ?? 10,
    // Vercel Cron expressions fire in UTC, so the monitor's expected-run window
    // must be UTC too - using CT here would mis-time the dead-man check by the
    // offset and raise a false "missed" alert on every run.
    timezone: 'UTC',
  });
}
