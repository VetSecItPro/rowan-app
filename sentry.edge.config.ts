import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to capture 10% of transactions in production
    tracesSampleRate: 0.1,

    // Set environment
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',
  });
}
