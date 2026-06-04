/**
 * Structured Logging Utility
 *
 * Replaces console.log/error/warn with secure logging that:
 * - Sanitizes sensitive data (passwords, tokens, secrets)
 * - Only logs to console in development
 * - Sends to Sentry in production
 * - Provides structured context
 *
 * Security: Prevents sensitive data leakage in logs
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  component?: string;
  action?: string;
  userId?: string;
  spaceId?: string;
} & Record<string, unknown>;

/**
 * Sensitive field patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  'password',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'session',
  'bearer',
  'jwt',
  'refresh_token',
  'access_token',
];

class Logger {
  /**
   * Sanitize data to remove sensitive fields
   */
  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Strip CRLF + other ASCII control chars to prevent log injection (CRLF splitting).
      // Tab (\t) is preserved; everything else in 0x00-0x1F and 0x7F is replaced with a space.
      // Truncate overly long strings to bound log size.
      const stripped = data.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, ' ');
      return stripped.length > 4096 ? `${stripped.slice(0, 4096)}...[truncated]` : stripped;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      const record = data as Record<string, unknown>;

      for (const key in record) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) continue;

        // Check if key matches sensitive pattern
        const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
          key.toLowerCase().includes(pattern)
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof record[key] === 'object') {
          sanitized[key] = this.sanitize(record[key]);
        } else {
          sanitized[key] = record[key];
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Log to console (development only) and Sentry (production)
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const sanitizedContext = this.sanitize(context);

    // Development: console logging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console -- this IS the logger implementation
      const logFn = console[level] || console.log;
      if (sanitizedContext) {
        logFn(`[${level.toUpperCase()}] ${message}`, sanitizedContext);
      } else {
        logFn(`[${level.toUpperCase()}] ${message}`);
      }
    }

    // Production: Sentry only.
    // Only `warn` is captured as a message here. `error` is handled by error()
    // below, which always sends a captureException (Issue) - routing errors
    // through captureMessage too would double-report every error event.
    if (process.env.NODE_ENV === 'production') {
      if (level === 'warn') {
        Sentry.captureMessage(message, {
          level: 'warning',
          tags: {
            component: context?.component,
            action: context?.action,
          },
          extra: sanitizedContext as Record<string, unknown> | undefined,
        });
      }
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('info', message, context);
    }
  }

  /**
   * Warning level logging (all environments)
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  /**
   * Error level logging (all environments)
   * Captures exceptions to Sentry in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    // Serialize Error objects properly (Error properties are non-enumerable)
    const serializedError = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        }
      : error;

    if (process.env.NODE_ENV === 'production') {
      const tags = {
        component: context?.component,
        action: context?.action,
      };
      const extra = this.sanitize(context) as Record<string, unknown> | undefined;

      if (error instanceof Error) {
        Sentry.captureException(error, { tags, extra });
      } else {
        // Message-only or non-Error payload (e.g. billing webhook failures that
        // log a string, or `logger.error(msg)` with no error object). Without
        // this branch these never reached Sentry Issues - they were the one
        // payment error you get all week, silently dropped. Synthesize an Error
        // from the message so it groups as an Issue with a real call stack, and
        // keep the original payload under extra.originalError.
        Sentry.captureException(new Error(message), {
          tags,
          extra: { ...extra, originalError: error },
        });
      }
    }

    // Always log in all environments (not just else block)
    this.log('error', message, { ...context, error: serializedError });
  }
}

export const logger = new Logger();
