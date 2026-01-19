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
      // Don't modify strings (might contain legitimate data)
      return data;
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
      const logFn = console[level] || console.log;
      if (sanitizedContext) {
        logFn(`[${level.toUpperCase()}] ${message}`, sanitizedContext);
      } else {
        logFn(`[${level.toUpperCase()}] ${message}`);
      }
    }

    // Production: Sentry only
    if (process.env.NODE_ENV === 'production') {
      if (level === 'error' || level === 'warn') {
        Sentry.captureMessage(message, {
          level: level === 'error' ? 'error' : 'warning',
          tags: {
            component: context?.component,
            action: context?.action,
          },
          extra: sanitizedContext,
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
    if (error instanceof Error && process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: {
          component: context?.component,
          action: context?.action,
        },
        extra: this.sanitize(context),
      });
    } else {
      this.log('error', message, { ...context, error });
    }
  }
}

export const logger = new Logger();
