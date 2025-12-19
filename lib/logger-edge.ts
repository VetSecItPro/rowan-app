/**
 * Edge Runtime Compatible Logging Utility
 * 
 * Simplified logger for Edge Runtime (middleware)
 * Does not use Sentry imports (not compatible with edge runtime)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  spaceId?: string;
  [key: string]: any;
}

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

class EdgeLogger {
  /**
   * Sanitize data to remove sensitive fields
   */
  private sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};

      for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

        const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
          key.toLowerCase().includes(pattern)
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof data[key] === 'object') {
          sanitized[key] = this.sanitize(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Log to console (development only)
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const sanitizedContext = this.sanitize(context);

    if (process.env.NODE_ENV === 'development') {
      const logFn = console[level] || console.log;
      if (sanitizedContext) {
        logFn(`[${level.toUpperCase()}] ${message}`, sanitizedContext);
      } else {
        logFn(`[${level.toUpperCase()}] ${message}`);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('info', message, context);
    }
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    this.log('error', message, { ...context, error });
  }
}

export const logger = new EdgeLogger();
