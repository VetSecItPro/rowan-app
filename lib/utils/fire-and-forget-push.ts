/**
 * Fire-and-Forget Push Notification Utility
 *
 * Wraps async push notification calls so they never block the API response
 * or throw unhandled errors. Failures are logged but do not affect the
 * caller's execution flow.
 */

import { logger } from '@/lib/logger';

/**
 * Executes an async push notification function without blocking.
 * Errors are caught and logged — never thrown to the caller.
 */
export function fireAndForgetPush(fn: () => Promise<unknown>): void {
  fn().catch((error) => {
    logger.error(
      'Push notification failed (non-blocking)',
      error instanceof Error ? error : undefined
    );
  });
}
