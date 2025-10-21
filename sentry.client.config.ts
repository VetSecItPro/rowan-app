// Client-side Sentry configuration
// This file is automatically loaded on the client side
import * as Sentry from '@sentry/nextjs';

// Only initialize if DSN is provided and we're in the browser
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions
    // Lower in production to reduce costs (0.1 = 10%)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Set environment
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

    // Don't send events in development
    enabled: process.env.NODE_ENV === 'production',

    // Ignore common errors
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
        // Capture 10% of all sessions
        sampleRate: 0.1,
        // Capture 100% of sessions with an error
        errorSampleRate: 1.0,
        // Mask text content to protect user privacy
        maskAllText: true,
        // Block media content for performance
        blockAllMedia: true,
      }),
    ],

    // Set user context
    beforeSend(event, hint) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
        return null;
      }
      return event;
    },

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