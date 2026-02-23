/**
 * Unit tests for lib/logger-edge.ts
 *
 * EdgeLogger behaviour:
 * - debug / info only output in development (NODE_ENV === 'development')
 * - warn / error also only output to console in development (edge has no Sentry)
 * - Sensitive fields (password, token, secret, etc.) are redacted to '[REDACTED]'
 * - Nested sensitive fields are also redacted
 * - Arrays are recursively sanitized
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger-edge';

describe('EdgeLogger — sensitive field redaction (development)', () => {
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

  it('redacts "authorization" field', () => {
    logger.warn('auth header check', { authorization: 'Bearer xyz' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] auth header check',
      expect.objectContaining({ authorization: '[REDACTED]' })
    );
  });

  it('redacts "cookie" field', () => {
    logger.warn('cookie check', { cookie: 'session=abc' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] cookie check',
      expect.objectContaining({ cookie: '[REDACTED]' })
    );
  });

  it('redacts "jwt" field', () => {
    logger.warn('jwt check', { jwt: 'eyJ...' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] jwt check',
      expect.objectContaining({ jwt: '[REDACTED]' })
    );
  });

  it('preserves non-sensitive fields', () => {
    logger.warn('safe fields', { component: 'auth', userId: 'u1', action: 'login' });
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] safe fields',
      expect.objectContaining({ component: 'auth', userId: 'u1', action: 'login' })
    );
  });

  it('redacts sensitive fields inside nested objects', () => {
    logger.warn('nested', { meta: { password: 'p', name: 'Alice' } });
    const call = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    const meta = call.meta as Record<string, unknown>;
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.name).toBe('Alice');
  });

  it('handles arrays by sanitizing each element', () => {
    logger.warn('array ctx', { items: [{ token: 't1' }, { label: 'safe' }] } as Parameters<typeof logger.warn>[1]);
    const call = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    const items = call.items as Array<Record<string, unknown>>;
    expect(items[0].token).toBe('[REDACTED]');
    expect(items[1].label).toBe('safe');
  });

  it('handles undefined context without throwing', () => {
    expect(() => logger.warn('no ctx', undefined)).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith('[WARN] no ctx');
  });
});

describe('EdgeLogger — log levels in development', () => {
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
  });

  it('debug logs in development', () => {
    logger.debug('debug msg');
    expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug msg');
  });

  it('info logs in development', () => {
    logger.info('info msg');
    expect(console.info).toHaveBeenCalledWith('[INFO] info msg');
  });

  it('warn logs in development', () => {
    logger.warn('warn msg');
    expect(console.warn).toHaveBeenCalledWith('[WARN] warn msg');
  });

  it('error logs in development (passes error in context)', () => {
    const err = new Error('boom');
    logger.error('error msg', err);
    // error() spreads { ...context, error } into the log context
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR] error msg',
      expect.objectContaining({ error: expect.any(Object) })
    );
  });

  it('error without an Error object still logs', () => {
    logger.error('plain error', 'some string error');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR] plain error',
      expect.objectContaining({ error: 'some string error' })
    );
  });
});

describe('EdgeLogger — log levels in non-development (production)', () => {
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
  });

  it('debug does NOT log in production (edge logger is console-only in dev)', () => {
    logger.debug('silent debug');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('info does NOT log in production', () => {
    logger.info('silent info');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('warn does NOT log to console in production (edge has no Sentry fallback)', () => {
    // EdgeLogger differs from main Logger — it has no Sentry integration.
    // Its private log() method only calls console when NODE_ENV === 'development'.
    logger.warn('silent warn');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('error does NOT log to console in production (edge has no Sentry fallback)', () => {
    logger.error('silent error');
    expect(console.error).not.toHaveBeenCalled();
  });
});
