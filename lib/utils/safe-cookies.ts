import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieOptions = Parameters<CookieStore['set']>[2];

// Mock cookie store for build time
// Use type assertion since we're providing a partial mock that won't be used at runtime
const mockCookieStore = {
  get: (name: string) => {
    void name;
    return undefined;
  },
  set: (name: string, value: string, options?: CookieOptions) => {
    void name;
    void value;
    void options;
    // Return self to satisfy the chainable ResponseCookies return type
    return mockCookieStore;
  },
  delete: (name: string, options?: CookieOptions) => {
    void name;
    void options;
    return mockCookieStore;
  },
  has: (name: string) => {
    void name;
    return false;
  },
  getAll: () => [],
  toString: () => '',
} as unknown as CookieStore;

/**
 * Async safe cookie accessor for API routes
 * In Next.js 15+, cookies() returns a Promise that must be awaited
 *
 * @example
 * const cookieStore = await safeCookiesAsync();
 * const session = cookieStore.get('session');
 */
export async function safeCookiesAsync(): Promise<CookieStore> {
  try {
    return await cookies();
  } catch {
    // During build time, provide a mock cookie store
    logger.warn('Cookies not available during build time, using mock store', { component: 'lib-safe-cookies' });
    return mockCookieStore;
  }
}

