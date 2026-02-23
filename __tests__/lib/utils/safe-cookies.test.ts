/**
 * Unit tests for lib/utils/safe-cookies.ts
 *
 * Tests safe cookie accessor utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('safeCookiesAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cookies from next/headers', async () => {
    const { cookies } = await import('next/headers');
    const mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      getAll: vi.fn(),
      toString: vi.fn(),
    };
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

    const result = await safeCookiesAsync();

    expect(result).toBe(mockCookieStore);
    expect(cookies).toHaveBeenCalled();
  });

  it('should return mock cookie store during build time', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();

    expect(result).toBeDefined();
    expect(typeof result.get).toBe('function');
    expect(typeof result.set).toBe('function');
    expect(typeof result.delete).toBe('function');
  });

  it('should log warning when using mock store', async () => {
    const { cookies } = await import('next/headers');
    const { logger } = await import('@/lib/logger');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    await safeCookiesAsync();

    expect(logger.warn).toHaveBeenCalledWith(
      'Cookies not available during build time, using mock store',
      expect.objectContaining({ component: 'lib-safe-cookies' })
    );
  });

  it('mock store should have get method that returns undefined', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();
    const cookie = result.get('test-cookie');

    expect(cookie).toBeUndefined();
  });

  it('mock store should have set method that does nothing', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();

    expect(() => result.set('name', 'value')).not.toThrow();
  });

  it('mock store should have delete method that does nothing', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();

    expect(() => result.delete('name')).not.toThrow();
  });

  it('mock store should have has method that returns false', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();
    const has = result.has('test-cookie');

    expect(has).toBe(false);
  });

  it('mock store should have getAll method that returns empty array', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();
    const all = result.getAll();

    expect(all).toEqual([]);
  });

  it('mock store should have toString method that returns empty string', async () => {
    const { cookies } = await import('next/headers');
    (cookies as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cookies not available'));

    const result = await safeCookiesAsync();
    const str = result.toString();

    expect(str).toBe('');
  });

  it('should handle cookies call during API route', async () => {
    const { cookies } = await import('next/headers');
    const mockCookieStore = {
      get: vi.fn((name) => ({ name, value: 'test-value' })),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(() => true),
      getAll: vi.fn(() => []),
      toString: vi.fn(() => 'cookie=value'),
    };
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookieStore);

    const result = await safeCookiesAsync();
    const cookie = result.get('session');

    expect(cookie).toEqual({ name: 'session', value: 'test-value' });
  });
});
