import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CSRF_EXEMPT_ROUTES, CSRF_HEADER_NAME, generateCsrfToken } from '@/lib/security/csrf';
import { PROTECTED_PATHS } from '@/lib/middleware/constants';

/**
 * Returns true if the pathname is a static asset that should bypass all middleware.
 */
export function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/rowan-logo.png' ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname)
  );
}

/**
 * Validates CSRF for state-changing API requests and rotates the token on success.
 * Returns a 403 response on failure, null if validation passes or is not required.
 *
 * Skips validation for: cron routes, webhook routes, CSRF-exempt routes.
 *
 * SECURITY (no Bearer exemption): unlike many SPA setups, requests carrying an
 * Authorization: Bearer header are NOT exempt here. Browser-initiated fetch
 * still attaches our auth cookie automatically, so a bearer-only carve-out
 * would let CSRF attackers ride the cookie. Native/server callers must opt
 * into CSRF_EXEMPT_ROUTES explicitly. Tightened after the cluster B audit.
 *
 * SECURITY (origin check): origin is validated before CSRF token comparison.
 * Vercel preview origins are whitelisted by prefix because preview URLs change
 * per branch — the prefix `rowan-app-` ensures we don't accept arbitrary
 * `*.vercel.app` origins.
 *
 * Token rotation on every state change defeats fixation: a leaked token from
 * one request can't be replayed for the next.
 */
export function checkCsrf(req: NextRequest, response: NextResponse): NextResponse | null {
  const { pathname } = req.nextUrl;
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isProtectedPath = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith('/api/');

  if (!isStateChanging || (!isProtectedPath && !isApiRoute)) return null;
  if (pathname.startsWith('/api/cron/') || pathname.includes('/webhook')) return null;

  // Origin validation
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    const originHost = new URL(origin).host.split(':')[0];
    const expectedHost = host.split(':')[0];
    const isVercelPreview = originHost.endsWith('.vercel.app') &&
      (originHost.startsWith('rowan-app-') || originHost === 'rowan-app.vercel.app');
    const isValidOrigin =
      originHost === expectedHost ||
      isVercelPreview ||
      (process.env.NODE_ENV === 'development' && originHost === 'localhost');
    if (!isValidOrigin) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }

  if (!isApiRoute) return null;

  const isCsrfExempt = CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
  if (isCsrfExempt) return null;

  const csrfCookie = req.cookies.get('__csrf_token')?.value;
  const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
  const csrfMatch = csrfCookie && csrfHeader && csrfCookie.length === csrfHeader.length &&
    (() => {
      const encoder = new TextEncoder();
      const a = encoder.encode(csrfCookie);
      const b = encoder.encode(csrfHeader);
      let result = 0;
      for (let i = 0; i < a.length; i++) { result |= a[i] ^ b[i]; }
      return result === 0;
    })();

  if (!csrfCookie || !csrfHeader || !csrfMatch) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  // Rotate CSRF token after each state-changing request (VULN-CSRF-001)
  response.cookies.set('__csrf_token', generateCsrfToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return null;
}
