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

    // Set tracesSampleRate to capture 10% of transactions in production
    tracesSampleRate: 0.1,

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

    // Performance monitoring options
    beforeSendTransaction(event) {
      // Filter out transactions that aren't useful
      if (event.transaction?.includes('/_next/')) {
        return null;
      }
      if (event.transaction?.includes('/api/auth/')) {
        return null;
      }
      return event;
    },
  });
}