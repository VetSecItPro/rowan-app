import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

/**
 * Safe cookie accessor that works during both runtime and build time
 *
 * During build time, Next.js tries to analyze API routes and encounters
 * cookies() calls, which cause "Cannot access cookies during build time" errors.
 * This wrapper provides a mock cookie store during build time.
 *
 * In Next.js 15+, cookies() returns a Promise, so we use React.use() to unwrap it.
 */
export function safeCookies() {
  try {
    const React = require('react');
    return React.use(cookies());
  } catch (error) {
    // During build time, provide a mock cookie store
    logger.warn('Cookies not available during build time, using mock store', { component: 'lib-safe-cookies' });
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
    const React = require('react');
    const cookieStore = React.use(cookies());
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
    const React = require('react');
    const cookieStore = React.use(cookies());
    cookieStore.set(name, value, options);
  } catch (error) {
    // During build time, do nothing
    logger.warn(`Cookie set ignored during build time: ${name}`, { component: 'lib-safe-cookies' });
  }
}