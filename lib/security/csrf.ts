import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF Protection Utilities
 *
 * Implements the Double Submit Cookie pattern for CSRF protection:
 * 1. Server generates a random token and stores it in an HTTP-only cookie
 * 2. Client sends the same token in a header (X-CSRF-Token)
 * 3. Server validates that cookie token === header token
 *
 * This works because:
 * - Attackers cannot read the cookie value (HTTP-only, SameSite)
 * - Attackers cannot set custom headers from cross-origin requests
 * - Both must match for the request to be valid
 */

const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 256 bits of entropy

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in response cookies
 * Call this when generating a new session or on the CSRF token endpoint
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token (cookie must match header)
 * Returns true if valid, false if invalid
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * List of HTTP methods that require CSRF protection
 * GET, HEAD, OPTIONS are considered "safe" methods
 */
export const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method.toUpperCase());
}

/**
 * Routes that are exempt from CSRF protection
 * (e.g., webhook endpoints that use their own authentication)
 */
export const CSRF_EXEMPT_ROUTES = [
  '/api/webhooks/',
  '/api/cron/',
  '/api/auth/callback',
  '/api/calendar/callback/',
  '/api/analytics/track',
  '/api/analytics/visit', // Public beacon endpoint (sendBeacon has no CSRF headers)
  '/api/notifications/track-dismissal',
  // Public endpoints that don't change state
  '/api/health',
  '/api/csrf/token', // Token endpoint itself
];

/**
 * Check if a route is exempt from CSRF protection
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

// Export constants for client use
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
