// Instrumentation file for Next.js 15+
// Canonical location for server and edge Sentry initialization.
// Client initialization lives in instrumentation-client.ts.

import * as Sentry from '@sentry/nextjs';

// Required by @sentry/nextjs v10.x+ for React Server Component error instrumentation
export const onRequestError = Sentry.captureRequestError;

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

        // Drop 10% of errors randomly for cost savings
        beforeSend(event) {
          if (Math.random() > 0.9) {
            return null;
          }
          return event;
        },

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

        // Drop 10% of errors randomly for cost savings
        beforeSend(event) {
          if (Math.random() > 0.9) {
            return null;
          }
          return event;
        },

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
