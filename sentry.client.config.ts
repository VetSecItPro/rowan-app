// Client-side Sentry configuration
// This file is automatically loaded on the client side
import * as Sentry from '@sentry/nextjs';

// COMPLETELY SKIP Sentry initialization in development to avoid console errors
const isProduction = process.env.NODE_ENV === 'production';
const hasDSN = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
const isBrowser = typeof window !== 'undefined';

// Only initialize Sentry in production with a valid DSN
if (isBrowser && isProduction && hasDSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // OPTIMIZATION: Dynamic sampling - 50% errors, 5% success transactions
    tracesSampleRate: 0.05, // 5% of successful transactions

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Set environment
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',

    // Ignore common errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Common browser errors that aren't actionable
      'Script error.',
      'Non-Error exception captured',
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
    ],

    // Custom integrations configuration
    integrations: [
      // Session Replay integration with proper configuration
      Sentry.replayIntegration({
        // Mask text content to protect user privacy
        maskAllText: true,
        // Block media content for performance
        blockAllMedia: true,
      }),
    ],

    // OPTIMIZATION: Dynamic error sampling - 50% of errors
    beforeSend(event) {
      // Sample 50% of error events
      if (Math.random() > 0.5) {
        return null;
      }
      return event;
    },

    // Performance monitoring options - filter non-useful transactions
    beforeSendTransaction(event) {
      // Filter out Next.js internal transactions
      if (event.transaction?.includes('/_next/')) {
        return null;
      }
      // Filter out auth-related transactions (high volume, low value)
      if (event.transaction?.includes('/api/auth/')) {
        return null;
      }
      // Filter out health check endpoints
      if (event.transaction?.includes('/api/health')) {
        return null;
      }
      // Filter out static asset requests
      if (event.transaction?.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)$/)) {
        return null;
      }
      return event;
    },
  });
}