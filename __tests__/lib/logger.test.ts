/**
 * Unit tests for lib/logger.ts
 *
 * Logger behaviour:
 * - debug / info only output in development
 * - warn / error always call Sentry.captureMessage / captureException in production
 * - Error objects are serialized (message, stack, name)
 * - Sensitive fields are redacted to '[REDACTED]'
 * - In production, Error instances are sent to Sentry.captureException
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock fns so they are available inside vi.mock factory
// ---------------------------------------------------------------------------
const { mockCaptureMessage, mockCaptureException } = vi.hoisted(() => ({
  mockCaptureMessage: vi.fn(),
  mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: mockCaptureMessage,
  captureException: mockCaptureException,
}));

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Sensitive-field redaction
// ---------------------------------------------------------------------------
describe('Logger — sensitive field redaction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('redacts "password" field', () => {
    logger.warn('test', { password: 'secret123' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] test',
      expect.objectContaining({ password: '[REDACTED]' })
    );
  });

  it('redacts "token" field', () => {
    logger.warn('token check', { token: 'abc.def.ghi' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] token check',
      expect.objectContaining({ token: '[REDACTED]' })
    );
  });

  it('redacts "api_key" field', () => {
    logger.warn('key check', { api_key: 'my-key-value' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] key check',
      expect.objectContaining({ api_key: '[REDACTED]' })
    );
  });

  it('redacts "secret" field', () => {
    logger.warn('secret check', { secret: 'shh' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] secret check',
      expect.objectContaining({ secret: '[REDACTED]' })
    );
  });

  it('redacts "refresh_token" field', () => {
    logger.warn('refresh', { refresh_token: 'rt123' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] refresh',
      expect.objectContaining({ refresh_token: '[REDACTED]' })
    );
  });

  it('preserves non-sensitive fields unchanged', () => {
    logger.warn('safe', { component: 'auth', userId: 'u1', spaceId: 's1' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] safe',
      expect.objectContaining({ component: 'auth', userId: 'u1', spaceId: 's1' })
    );
  });

  it('redacts sensitive fields in nested objects', () => {
    logger.warn('nested', { meta: { password: 'x', name: 'Bob' } });
    const ctx = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    const meta = ctx.meta as Record<string, unknown>;
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.name).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// Log levels in development
// ---------------------------------------------------------------------------
describe('Logger — log levels in development', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('debug logs to console in development', () => {
    logger.debug('debug msg');
    expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug msg');
  });

  it('info logs to console in development', () => {
    logger.info('info msg');
    expect(console.info).toHaveBeenCalledWith('[INFO] info msg');
  });

  it('warn logs to console in development', () => {
    logger.warn('warn msg');
    expect(console.warn).toHaveBeenCalledWith('[WARN] warn msg');
  });

  it('error logs to console with error context', () => {
    logger.error('error msg', new Error('fail'));
    expect(console.error).toHaveBeenCalled();
    const firstArg = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstArg).toBe('[ERROR] error msg');
  });
});

// ---------------------------------------------------------------------------
// Log levels in production
// ---------------------------------------------------------------------------
describe('Logger — log levels in production', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('debug does NOT log to console in production', () => {
    logger.debug('silent');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('info does NOT log to console in production', () => {
    logger.info('silent');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('warn sends to Sentry.captureMessage in production', () => {
    logger.warn('prod warn', { component: 'auth' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'prod warn',
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('error with non-Error sends to Sentry.captureMessage in production', () => {
    logger.error('prod error non-err', 'string error');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'prod error non-err',
      expect.objectContaining({ level: 'error' })
    );
  });

  it('error with Error instance sends to Sentry.captureException in production', () => {
    const err = new Error('prod failure');
    logger.error('prod error', err, { component: 'payments' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: expect.objectContaining({ component: 'payments' }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Error serialization
// ---------------------------------------------------------------------------
describe('Logger — error serialization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('serializes Error objects to include name, message, and stack', () => {
    const err = new Error('test error');
    logger.error('serialized', err);
    const ctx = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    const serialized = ctx.error as Record<string, unknown>;
    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe('test error');
    expect(typeof serialized.stack).toBe('string');
  });

  it('passes non-Error values through without serialization', () => {
    logger.error('raw string error', 'something went wrong');
    const ctx = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    expect(ctx.error).toBe('something went wrong');
  });

  it('handles undefined error value without throwing', () => {
    expect(() => logger.error('no error object', undefined)).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Sentry tag forwarding
// ---------------------------------------------------------------------------
describe('Logger — Sentry tag forwarding in production', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('forwards component and action tags to Sentry on warn', () => {
    logger.warn('tagged warn', { component: 'tasks', action: 'create' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'tagged warn',
      expect.objectContaining({
        tags: expect.objectContaining({ component: 'tasks', action: 'create' }),
      })
    );
  });

  it('forwards component and action tags to Sentry on error with Error object', () => {
    const err = new Error('tag test');
    logger.error('tagged error', err, { component: 'meals', action: 'fetch' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: expect.objectContaining({ component: 'meals', action: 'fetch' }),
      })
    );
  });
});
