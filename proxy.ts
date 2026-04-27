/**
 * Next.js Edge Middleware — thin orchestrator
 *
 * Security layers are implemented in lib/middleware/:
 *   bot-blocking, request-validation, auth, admin-session,
 *   email-verification, csrf, csp
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isStaticAsset, checkCsrf } from '@/lib/middleware/csrf';
import { checkBotBlocking } from '@/lib/middleware/bot-blocking';
import { checkBodySize, getSanitizedHeaders } from '@/lib/middleware/request-validation';
import { initAuth } from '@/lib/middleware/auth';
import { handleAdminPath } from '@/lib/middleware/admin-session';
import { checkEmailVerification } from '@/lib/middleware/email-verification';
import { applySecurityHeaders, generateNonce } from '@/lib/middleware/csp';
import { PROTECTED_PATHS } from '@/lib/middleware/constants';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();

  const botBlock = checkBotBlocking(req);
  if (botBlock) return botBlock;

  const sizeBlock = checkBodySize(req);
  if (sizeBlock) return sizeBlock;

  const sanitizedHeaders = getSanitizedHeaders(req);
  const { response, session, supabase } = await initAuth(req, sanitizedHeaders);

  // Admin SSO + session management (reuses the auth-layer Supabase client
  // so any JWT refresh during the RPC call persists via cookie handlers)
  const adminResult = await handleAdminPath(req, session, response, () =>
    supabase.rpc('get_admin_details')
  );
  if (adminResult) return adminResult;

  // Protected routes — require authentication
  const isProtectedPath = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (isProtectedPath && !session && pathname !== '/invitations/accept') {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Email verification enforcement for new users
  if (isProtectedPath) {
    const emailBlock = checkEmailVerification(req, pathname, session);
    if (emailBlock) return emailBlock;
  }

  // Redirect already-authenticated users away from auth pages
  if (['/login', '/signup'].includes(pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // CSRF + origin validation for state-changing requests
  const csrfBlock = checkCsrf(req, response);
  if (csrfBlock) return csrfBlock;

  // Security headers (skipped in development to match next.config.mjs)
  if (process.env.NODE_ENV !== 'development') {
    applySecurityHeaders(response, generateNonce());
  }

  return response;
}

export const config = {
  // Run middleware on all routes except static/SEO files. The previous matcher
  // was a hand-curated list of protected paths, which meant CSP and other
  // security headers were never applied to public pages (/, /about, /pricing,
  // legal pages, etc.) — flagged as MON-5-001 by /monitor on 2026-04-27.
  //
  // isStaticAsset() in proxy() provides defense-in-depth; a path slipping into
  // the matcher gets short-circuited there before any heavy work runs.
  matcher: [
    '/((?!_next/|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.json|sw\\.js|images/|fonts/).*)',
  ],
};
