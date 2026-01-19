import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieOptions = Parameters<CookieStore['set']>[2];

// Mock cookie store for build time
const mockCookieStore: CookieStore = {
  get: (name: string) => {
    void name;
    return undefined;
  },
  set: (name: string, value: string, options?: CookieOptions) => {
    void name;
    void value;
    void options;
  },
  delete: (name: string, options?: CookieOptions) => {
    void name;
    void options;
  },
  has: (name: string) => {
    void name;
    return false;
  },
  getAll: () => [],
  toString: () => '',
};

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

/**
 * Synchronous safe cookie accessor (DEPRECATED - use safeCookiesAsync for API routes)
 * This is kept for backward compatibility but should not be used in API routes.
 *
 * During build time, Next.js tries to analyze API routes and encounters
 * cookies() calls, which cause "Cannot access cookies during build time" errors.
 * This wrapper provides a mock cookie store during build time.
 *
 * WARNING: In Next.js 15+, cookies() returns a Promise. Using React.use()
 * only works inside React components, NOT in API routes.
 * For API routes, use safeCookiesAsync() instead.
 */
export function safeCookies(): CookieStore {
  try {
    const store = cookies();
    if (typeof (store as Promise<CookieStore>).then === 'function') {
      logger.warn('Sync cookies access unavailable, returning mock store', { component: 'lib-safe-cookies' });
      return mockCookieStore;
    }
    return store as CookieStore;
  } catch {
    // During build time or API routes, provide a mock cookie store
    logger.warn('Cookies not available during build time, using mock store', { component: 'lib-safe-cookies' });
    return mockCookieStore;
  }
}

/**
 * Async safe cookie getter for API routes
 */
export async function safeCookieGetAsync(name: string) {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name);
  } catch {
    // During build time, return undefined
    return undefined;
  }
}

/**
 * Safe cookie getter (DEPRECATED - use safeCookieGetAsync for API routes)
 */
export function safeCookieGet(name: string) {
  const cookieStore = safeCookies();
  return cookieStore.get(name);
}

/**
 * Async safe cookie setter for API routes
 */
export async function safeCookieSetAsync(name: string, value: string, options?: CookieOptions) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(name, value, options);
  } catch {
    // During build time, do nothing
    logger.warn(`Cookie set ignored during build time: ${name}`, { component: 'lib-safe-cookies' });
  }
}

/**
 * Safe cookie setter (DEPRECATED - use safeCookieSetAsync for API routes)
 */
export function safeCookieSet(name: string, value: string, options?: CookieOptions) {
  try {
    const cookieStore = safeCookies();
    cookieStore.set(name, value, options);
  } catch {
    // During build time, do nothing
    logger.warn(`Cookie set ignored during build time: ${name}`, { component: 'lib-safe-cookies' });
  }
}
