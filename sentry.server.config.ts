import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // OPTIMIZATION: Dynamic sampling - 5% of successful transactions
    tracesSampleRate: 0.05,

    // Set environment
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',

    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Database connection errors that auto-recover
      'ECONNRESET',
      'ETIMEDOUT',
    ],

    // OPTIMIZATION: Dynamic error sampling - 50% of errors
    beforeSend(event) {
      // Sample 50% of error events
      if (Math.random() > 0.5) {
        return null;
      }
      return event;
    },

    // OPTIMIZATION: Filter out high-volume, low-value transactions
    beforeSendTransaction(event) {
      const transaction = event.transaction || '';

      // Filter out health check endpoints
      if (transaction.includes('/api/health')) {
        return null;
      }
      // Filter out cron/internal endpoints
      if (transaction.includes('/api/cron')) {
        return null;
      }
      // Filter out auth callback spam
      if (transaction.includes('/api/auth/callback')) {
        return null;
      }
      // Filter out static files
      if (transaction.includes('/_next/static')) {
        return null;
      }
      // Filter out favicon/manifest requests
      if (transaction.match(/\/(favicon|manifest|sw\.js)/)) {
        return null;
      }

      return event;
    },
  });
}
