// Client-side Sentry initialization (Next.js instrumentation convention)
// Replaces deprecated sentry.client.config.ts for @sentry/nextjs v10.x+
import * as Sentry from '@sentry/nextjs';

// Required by @sentry/nextjs v10.x+ for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const isProduction = process.env.NODE_ENV === 'production';
const hasDSN = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
const isBrowser = typeof window !== 'undefined';

if (isBrowser && isProduction && hasDSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Standardized: 5% of successful transactions (family app, low volume)
    tracesSampleRate: 0.05,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',

    // Browser-specific errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Non-Error exception captured',
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Chunk loading errors (code-split navigation failures)
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      // Generic browser noise
      'Script error.',
    ],

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Drop 10% of errors randomly for cost savings
    beforeSend(event) {
      if (Math.random() > 0.9) {
        return null;
      }
      return event;
    },

    // Filter non-useful transactions
    beforeSendTransaction(event) {
      // Next.js internal / static assets
      if (event.transaction?.includes('/_next/')) {
        return null;
      }
      // Auth endpoints (high volume, low value)
      if (event.transaction?.includes('/api/auth/')) {
        return null;
      }
      // Health checks
      if (event.transaction?.includes('/api/health')) {
        return null;
      }
      // Static asset requests
      if (event.transaction?.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)$/)) {
        return null;
      }
      return event;
    },
  });
}
