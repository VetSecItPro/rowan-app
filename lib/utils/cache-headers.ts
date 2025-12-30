/**
 * HTTP Cache-Control header utilities
 *
 * These utilities help standardize caching behavior across API routes.
 *
 * CACHING STRATEGIES:
 * - Private: User-specific data (tasks, messages, etc.) - browser cache only
 * - Public: Static content (recipes, public pages) - CDN + browser cache
 * - No-store: Sensitive data (auth, payments) - never cache
 */

import { NextResponse } from 'next/server';

/** Cache configuration options */
interface CacheOptions {
  /** Maximum age in seconds for browser cache */
  maxAge?: number;
  /** Maximum age in seconds for CDN/shared cache (s-maxage) */
  sMaxAge?: number;
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number;
  /** Whether the response is private (user-specific) or public */
  isPrivate?: boolean;
  /** Whether to require revalidation */
  mustRevalidate?: boolean;
}

/**
 * Add Cache-Control headers to a NextResponse
 *
 * @example
 * // User-specific data with 30s cache
 * return withCacheHeaders(NextResponse.json(data), { maxAge: 30, isPrivate: true });
 *
 * // Public data with longer cache
 * return withCacheHeaders(NextResponse.json(data), { maxAge: 300, sMaxAge: 600 });
 */
export function withCacheHeaders(
  response: NextResponse,
  options: CacheOptions = {}
): NextResponse {
  const {
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
    isPrivate = true,
    mustRevalidate = false,
  } = options;

  const directives: string[] = [];

  // Privacy directive
  directives.push(isPrivate ? 'private' : 'public');

  // Max-age directive
  directives.push(`max-age=${maxAge}`);

  // Shared max-age (for CDNs) - only for public responses
  if (!isPrivate && sMaxAge !== undefined) {
    directives.push(`s-maxage=${sMaxAge}`);
  }

  // Stale-while-revalidate for better UX
  if (staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  // Must-revalidate for sensitive data
  if (mustRevalidate) {
    directives.push('must-revalidate');
  }

  response.headers.set('Cache-Control', directives.join(', '));
  return response;
}

/**
 * Preset for user-specific data with short cache and stale-while-revalidate
 * Good for: tasks, messages, calendar events, etc.
 */
export function withUserDataCache(response: NextResponse): NextResponse {
  return withCacheHeaders(response, {
    maxAge: 30,
    staleWhileRevalidate: 60,
    isPrivate: true,
  });
}

/**
 * Preset for frequently changing user data with minimal cache
 * Good for: notifications, real-time updates
 */
export function withDynamicDataCache(response: NextResponse): NextResponse {
  return withCacheHeaders(response, {
    maxAge: 5,
    staleWhileRevalidate: 30,
    isPrivate: true,
  });
}

/**
 * Preset for semi-static public content
 * Good for: recipe search, public APIs
 */
export function withPublicDataCache(response: NextResponse): NextResponse {
  return withCacheHeaders(response, {
    maxAge: 300, // 5 minutes browser cache
    sMaxAge: 3600, // 1 hour CDN cache
    staleWhileRevalidate: 86400, // 24 hours stale-while-revalidate
    isPrivate: false,
  });
}

/**
 * Preset for sensitive data that should never be cached
 * Good for: auth endpoints, payment info
 */
export function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
