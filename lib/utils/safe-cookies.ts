import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// Mock cookie store for build time
const mockCookieStore = {
  get: (name: string) => undefined,
  set: (name: string, value: string, options?: any) => {},
  delete: (name: string, options?: any) => {},
  has: (name: string) => false,
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
export async function safeCookiesAsync() {
  try {
    return await cookies();
  } catch (error) {
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
export function safeCookies() {
  try {
    // Try to use it synchronously for component contexts
    // This will fail in API routes and trigger the catch
    const React = require('react');
    return React.use(cookies());
  } catch (error) {
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
  } catch (error) {
    // During build time, return undefined
    return undefined;
  }
}

/**
 * Safe cookie getter (DEPRECATED - use safeCookieGetAsync for API routes)
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
 * Async safe cookie setter for API routes
 */
export async function safeCookieSetAsync(name: string, value: string, options?: any) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(name, value, options);
  } catch (error) {
    // During build time, do nothing
    logger.warn(`Cookie set ignored during build time: ${name}`, { component: 'lib-safe-cookies' });
  }
}

/**
 * Safe cookie setter (DEPRECATED - use safeCookieSetAsync for API routes)
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