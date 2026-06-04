// Instrumentation file for Next.js 15+
// Canonical location for server and edge Sentry initialization.
// Client initialization lives in instrumentation-client.ts.

import * as Sentry from '@sentry/nextjs';
import { checkProductionEnv } from '@/lib/config/required-env';

// Required by @sentry/nextjs v10.x+ for React Server Component error instrumentation
export const onRequestError = Sentry.captureRequestError;

/**
 * Validate required production env vars once at server startup and surface any
 * gaps to Sentry (Phase 13.4). Call AFTER Sentry.init so captureMessage works.
 */
function reportProductionEnvGaps(sentry: typeof Sentry) {
  const { ok, missingCritical, missingWarn } = checkProductionEnv();
  if (ok && missingWarn.length === 0) return;

  for (const v of missingCritical) {
     
    console.error(`[env] MISSING CRITICAL env ${v.name} - ${v.reason}`);
    sentry.captureMessage(`Missing critical production env: ${v.name}`, {
      level: 'error',
      tags: { component: 'startup-env-check', envVar: v.name },
      extra: { reason: v.reason },
    });
  }
  for (const v of missingWarn) {
    // eslint-disable-next-line no-console -- startup diagnostic, before request logging
    console.warn(`[env] missing env ${v.name} - ${v.reason} (degraded)`);
    sentry.captureMessage(`Missing production env: ${v.name}`, {
      level: 'warning',
      tags: { component: 'startup-env-check', envVar: v.name },
      extra: { reason: v.reason },
    });
  }
}

export async function register() {
  if (process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const Sentry = await import('@sentry/nextjs');

      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
        enabled: true,

        // Standardized: 5% of successful transactions
        tracesSampleRate: 0.05,

        // Server-relevant errors only
        ignoreErrors: [
          // Database / network errors that auto-recover
          'ECONNRESET',
          'ETIMEDOUT',
          'ECONNREFUSED',
          'EPIPE',
          'ENOTFOUND',
          // Supabase pool exhaustion (transient)
          'remaining connection slots are reserved',
          'too many clients already',
          // Non-actionable
          'Non-Error promise rejection captured',
        ],

        // Filter high-volume, low-value transactions
        beforeSendTransaction(event) {
          const tx = event.transaction || '';

          // Health check endpoints
          if (tx.includes('/api/health')) {
            return null;
          }
          // Cron / internal endpoints
          if (tx.includes('/api/cron')) {
            return null;
          }
          // Auth callback spam
          if (tx.includes('/api/auth/callback')) {
            return null;
          }
          // Static files
          if (tx.includes('/_next/static')) {
            return null;
          }
          // Favicon / manifest / service worker
          if (tx.match(/\/(favicon|manifest|sw\.js)/)) {
            return null;
          }

          return event;
        },
      });

      // One-shot required-env validation (Phase 13.4). Node runtime only — the
      // server-only vars (CRON_SECRET, RESEND_API_KEY, ...) don't exist on edge.
      reportProductionEnvGaps(Sentry);
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      const Sentry = await import('@sentry/nextjs');

      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
        enabled: true,

        // Standardized: 5% of successful transactions
        tracesSampleRate: 0.05,

        // Edge-relevant errors
        ignoreErrors: [
          // Network / fetch timeouts in edge runtime
          'network error',
          'The operation was aborted',
          'AbortError',
          // Edge function execution limits
          'Edge Function has timed out',
          'Script execution timed out',
          // Non-actionable
          'Non-Error promise rejection captured',
        ],

        // Middleware runs on every request — aggressively filter noise
        beforeSendTransaction(event) {
          const tx = event.transaction || '';

          // Health check endpoints
          if (tx.includes('/api/health')) {
            return null;
          }
          // Static assets (middleware intercepts these)
          if (tx.includes('/_next/')) {
            return null;
          }
          // Auth callbacks
          if (tx.includes('/api/auth/callback')) {
            return null;
          }
          // Favicon / manifest / service worker
          if (tx.match(/\/(favicon|manifest|sw\.js|robots\.txt|sitemap)/)) {
            return null;
          }

          return event;
        },
      });
    }
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}
