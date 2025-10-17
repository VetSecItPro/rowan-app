// Instrumentation file for Next.js 13+
// This file is automatically loaded by Next.js before your application starts
// Used to initialize Sentry and other monitoring tools

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
