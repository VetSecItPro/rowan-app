import * as Sentry from '@sentry/nextjs';
import type { User } from '@supabase/supabase-js';

/**
 * Set user context in Sentry for error tracking
 * This helps identify which users are experiencing errors
 */
export function setSentryUser(user: User | null | undefined) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.name || user.email?.split('@')[0],
  });
}

/**
 * Add breadcrumb for user actions
 * This helps track what the user was doing before an error occurred
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception with additional context
 */
export function captureSentryException(
  error: unknown,
  context: {
    endpoint: string;
    method: string;
    userId?: string;
    spaceId?: string;
    [key: string]: any;
  }
) {
  Sentry.captureException(error, {
    tags: {
      endpoint: context.endpoint,
      method: context.method,
    },
    extra: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  });
}
