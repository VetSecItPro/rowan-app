// Instrumentation file for Next.js 14+
// This file is automatically loaded by Next.js before your application starts
// Used to initialize Sentry and other monitoring tools

export async function register() {
  // Only initialize Sentry if DSN is provided
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // Server-side initialization
      const { init } = await import('@sentry/nextjs');

      init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

        // Set tracesSampleRate to 1.0 to capture 100% of transactions
        // Lower in production to reduce costs (0.1 = 10%)
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Set environment
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

        // Don't send events in development
        enabled: process.env.NODE_ENV === 'production',

        // Server-specific configuration
        beforeSend(event, hint) {
          // Don't send events in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
            return null;
          }
          return event;
        },

        // Ignore common errors
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          'ResizeObserver loop completed with undelivered notifications',
          // Network errors
          'Network request failed',
          'NetworkError',
          'Failed to fetch',
        ],

        // Automatic instrumentation disabled to prevent Next.js 15 issues
      });
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge runtime initialization
      const { init } = await import('@sentry/nextjs');

      init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

        // Set tracesSampleRate to 1.0 to capture 100% of transactions
        // Lower in production to reduce costs (0.1 = 10%)
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Set environment
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

        // Don't send events in development
        enabled: process.env.NODE_ENV === 'production',
      });
    }
  }
}