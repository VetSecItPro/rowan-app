import { cookies } from 'next/headers';

/**
 * Safe cookie accessor that works during both runtime and build time
 *
 * During build time, Next.js tries to analyze API routes and encounters
 * cookies() calls, which cause "Cannot access cookies during build time" errors.
 * This wrapper provides a mock cookie store during build time.
 */
export function safeCookies() {
  try {
    return cookies();
  } catch (error) {
    // During build time, provide a mock cookie store
    console.warn('Cookies not available during build time, using mock store');
    return {
      get: (name: string) => undefined,
      set: (name: string, value: string, options?: any) => {},
      delete: (name: string, options?: any) => {},
      has: (name: string) => false,
      getAll: () => [],
      toString: () => '',
    };
  }
}

/**
 * Safe cookie getter that returns undefined during build time
 */
export function safeCookieGet(name: string) {
  try {
    const cookieStore = cookies();
    return cookieStore.get(name);
  } catch (error) {
    // During build time, return undefined
    return undefined;
  }
}

/**
 * Safe cookie setter that does nothing during build time
 */
export function safeCookieSet(name: string, value: string, options?: any) {
  try {
    const cookieStore = cookies();
    cookieStore.set(name, value, options);
  } catch (error) {
    // During build time, do nothing
    console.warn(`Cookie set ignored during build time: ${name}`);
  }
}