/**
 * Next.js Edge Middleware
 *
 * SECURITY LAYER: Authentication, Authorization, CSRF Protection, Security Headers
 *
 * This middleware runs on ALL requests matching the config.matcher and provides:
 * 1. Authentication - Validates Supabase sessions for protected routes
 * 2. Authorization - Enforces admin access with SSO and encrypted session cookies
 * 3. CSRF Protection - Validates Origin headers on state-changing requests
 * 4. Security Headers - CSP, HSTS, X-Frame-Options, etc.
 *
 * PERFORMANCE: Runs at edge (Vercel Edge Runtime) for minimal latency
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionData, validateSessionData, encryptSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger-edge';
import { CSRF_EXEMPT_ROUTES, CSRF_HEADER_NAME, generateCsrfToken } from '@/lib/security/csrf';

/** Admin session duration in seconds (24 hours) - must match login route */
const ADMIN_SESSION_DURATION = 24 * 60 * 60;

// SECURITY: 90-day session duration — FIX-024
const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 7776000 seconds

/**
 * Email verification enforcement cutoff date
 * Users who signed up BEFORE this date are grandfathered in (no email verification required)
 * Users who signed up ON or AFTER this date must verify their email
 *
 * Set to: January 4, 2026 (grandfathering all beta users before this date)
 */
const EMAIL_VERIFICATION_CUTOFF = new Date('2026-01-04T00:00:00Z');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // PERFORMANCE: Skip middleware for static assets and public files
  // These don't need auth checks and should serve as fast as possible
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/rowan-logo.png' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // SECURITY: Request body size limits for API routes (API-009)
  // Reject oversized payloads early before any processing
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {
    const contentLength = req.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const isLargeUploadRoute =
        pathname.startsWith('/api/upload/') ||
        pathname.startsWith('/api/calendar/import/');
      const maxBytes = isLargeUploadRoute ? 10 * 1024 * 1024 : 1024 * 1024; // 10MB or 1MB
      if (!Number.isNaN(bytes) && bytes > maxBytes) {
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: 413 }
        );
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Apply persistent login: 1 year cookie expiration for auth cookies
          const persistentOptions = {
            ...options,
            maxAge: options.maxAge || SESSION_COOKIE_MAX_AGE,
            path: options.path || '/',
            sameSite: options.sameSite || 'lax',
            secure: options.secure ?? process.env.NODE_ENV === 'production',
          };
          req.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // SECURITY: Use getUser() for server-side auth validation, not getSession()
  // getSession() only reads from cookies without server-side JWT verification
  // PERF: getUser() validates JWT server-side on every request (50-200ms). Intentional security trade-off — FIX-016 accepted risk.
  const { data: { user: authUser } } = await supabase.auth.getUser();
  // Build a session-compatible object for downstream checks
  const session = authUser ? { user: authUser } : null;

  // Admin routes - Single Sign-On (no separate admin login)
  // Handle both page routes (/admin/*) and API routes (/api/admin/*)
  const isAdminPagePath = req.nextUrl.pathname.startsWith('/admin');
  const isAdminApiPath = req.nextUrl.pathname.startsWith('/api/admin');
  const isAdminPath = isAdminPagePath || isAdminApiPath;
  const isAdminLoginPath = req.nextUrl.pathname === '/admin/login';

  // Redirect old admin login page to regular login
  if (isAdminLoginPath) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', '/admin/dashboard');
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath) {
    // First check if there's a valid admin-session cookie
    const adminSessionCookie = req.cookies.get('admin-session')?.value;

    if (adminSessionCookie) {
      try {
        const sessionData = await decryptSessionData(adminSessionCookie);
        if (validateSessionData(sessionData)) {
          // Valid admin session - allow access
          // For API routes, refresh the cookie if it's getting close to expiration (within 30 min)
          const typedSession = sessionData as { expiresAt: number; adminId: string; email: string; role?: string; permissions?: string[]; authUserId?: string };
          const thirtyMinutes = 30 * 60 * 1000;
          if (typedSession.expiresAt - Date.now() < thirtyMinutes) {
            // Refresh the session
            const newSessionData = {
              ...typedSession,
              expiresAt: Date.now() + (ADMIN_SESSION_DURATION * 1000),
            };
            const newSessionPayload = await encryptSessionData(newSessionData);
            response.cookies.set('admin-session', newSessionPayload, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: ADMIN_SESSION_DURATION,
              path: '/',
            });
          }
          // Add verified admin header for API routes
          // SECURITY: This header confirms middleware validated the admin session
          if (isAdminApiPath) {
            response.headers.set('x-admin-verified', 'true');
            response.headers.set('x-admin-id', typedSession.adminId);
          }
          return response;
        }
      } catch {
        // Invalid cookie, will try SSO below
      }
    }

    // No valid admin session - try SSO with regular auth
    if (!session) {
      // Not logged in at all
      if (isAdminApiPath) {
        // For API routes, return 401 instead of redirect
        return NextResponse.json(
          { error: 'Admin authentication required' },
          { status: 401 }
        );
      }
      // For page routes, redirect to login
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // User is logged in - check if they're an admin
    try {
      const { data: adminData, error: adminError } = await supabase.rpc('get_admin_details');

      if (adminError) {
        // RPC error - log details
        logger.error('Admin RPC error', adminError, {
          component: 'middleware',
          action: 'admin_rpc_check',
          path: req.nextUrl.pathname,
          errorCode: adminError.code,
          errorMessage: adminError.message,
        });
        if (isAdminApiPath) {
          return NextResponse.json(
            { error: 'Admin verification failed' },
            { status: 500 }
          );
        }
        const redirectUrl = new URL('/dashboard', req.url);
        redirectUrl.searchParams.set('error', 'admin_rpc_error');
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.delete('admin-session');
        return res;
      }

      if (!adminData || adminData.length === 0) {
        // Not an admin
        if (isAdminApiPath) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
        const redirectUrl = new URL('/dashboard', req.url);
        redirectUrl.searchParams.set('error', 'admin_required');
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.delete('admin-session');
        return res;
      }

      // User is an admin - create admin session cookie automatically
      const admin = adminData[0];
      const sessionData = {
        adminId: admin.admin_id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        authUserId: session.user.id,
        loginTime: Date.now(),
        expiresAt: Date.now() + (ADMIN_SESSION_DURATION * 1000),
      };

      const sessionPayload = await encryptSessionData(sessionData);

      if (isAdminApiPath) {
        // For API routes, set the cookie in the response AND add a header for immediate verification
        // The cookie won't be readable by the API route on THIS request, but the header will be
        // SECURITY: This header is only set by middleware after successful admin verification
        response.cookies.set('admin-session', sessionPayload, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: ADMIN_SESSION_DURATION,
          path: '/',
        });
        // Add verified admin header for the API route to check as fallback
        // This is safe because only middleware can set this header (stripped from client requests)
        response.headers.set('x-admin-verified', 'true');
        response.headers.set('x-admin-id', admin.admin_id);
        return response;
      }

      // For page routes, redirect to pick up the cookie
      const res = NextResponse.redirect(new URL(req.nextUrl.pathname, req.url));
      res.cookies.set('admin-session', sessionPayload, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_SESSION_DURATION,
        path: '/',
      });
      return res;

    } catch (error) {
      // SECURITY: Log admin access failures for audit trail
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Admin SSO check failed', error, {
        component: 'middleware',
        action: 'admin_sso_check',
        path: req.nextUrl.pathname,
        errorMessage,
      });
      if (isAdminApiPath) {
        return NextResponse.json(
          { error: 'Admin authentication error' },
          { status: 500 }
        );
      }
      const redirectUrl = new URL('/dashboard', req.url);
      // Include error hint for debugging (sanitized, truncated)
      // Extract actual error from "Failed to encrypt session data: <actual error>"
      const actualError = errorMessage.includes(': ') ? errorMessage.split(': ').pop() || '' : errorMessage;
      const sanitizedError = actualError.substring(0, 50).replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
      redirectUrl.searchParams.set('error', `admin_err_${sanitizedError}`);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Protected routes - require authentication
  const protectedPaths = [
    '/dashboard',
    '/tasks',
    '/calendar',
    '/messages',
    '/reminders',
    '/shopping',
    '/meals',
    '/projects',
    '/recipes',
    '/goals',
    '/settings',
    '/invitations',
    '/feedback',
    '/expenses',
    '/budget',
    '/budget-setup',
    '/location',
    '/rewards',
    '/achievements',
    '/year-in-review',
    '/reports',
  ];

  const isProtectedPath = protectedPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  );

  // Exception: /invitations/accept must be accessible to unauthenticated users
  // so the page can redirect them to signup with their invite_token
  const isInvitationAcceptPath = req.nextUrl.pathname === '/invitations/accept';

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session && !isInvitationAcceptPath) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Email verification enforcement for NEW users (after cutoff date)
  // Users who signed up before EMAIL_VERIFICATION_CUTOFF are grandfathered in
  if (isProtectedPath && session?.user) {
    const userCreatedAt = session.user.created_at ? new Date(session.user.created_at) : null;
    const emailConfirmedAt = session.user.email_confirmed_at;

    // Only enforce email verification for users created AFTER the cutoff date
    const isNewUser = userCreatedAt && userCreatedAt >= EMAIL_VERIFICATION_CUTOFF;

    if (isNewUser && !emailConfirmedAt) {
      // New user without verified email - redirect to verification page
      // Allow access to verification-related pages to avoid redirect loop
      const verificationPaths = ['/verify-email', '/api/auth/resend-verification'];
      const isVerificationPath = verificationPaths.some(path => pathname.startsWith(path));

      if (!isVerificationPath) {
        // FIX-052: Do not expose user email in redirect URL query parameter
        const redirectUrl = new URL('/verify-email', req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // Auth pages - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.includes(req.nextUrl.pathname);

  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // CSRF Protection: Validate Origin header for state-changing requests
  // SECURITY: Now covers BOTH protected page paths AND API routes
  const method = req.method;
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  // Skip CSRF check for cron routes (authenticated by CRON_SECRET header)
  const isCronRoute = req.nextUrl.pathname.startsWith('/api/cron/');
  // Skip CSRF check for webhook routes (authenticated by webhook signatures)
  const isWebhookRoute = req.nextUrl.pathname.includes('/webhook');

  if (isStateChanging && (isProtectedPath || isApiRoute) && !isCronRoute && !isWebhookRoute) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // Allow requests from same origin or when origin is not present (same-site)
    if (origin && host) {
      const originUrl = new URL(origin);
      const expectedHost = host.split(':')[0]; // Remove port if present
      const originHost = originUrl.host.split(':')[0]; // Remove port from origin too

      // SECURITY FIX: Use strict equality instead of includes() to prevent subdomain bypass
      // e.g., rowan.app.attacker.com would pass includes() check but fail strict equality
      //
      // SECURITY: Vercel preview pattern restricted to this project only
      // Prevents CSRF from arbitrary *.vercel.app domains
      // Valid patterns: rowan-app-{hash}.vercel.app, rowan-app-git-{branch}-*.vercel.app
      const isVercelPreview = originHost.endsWith('.vercel.app') &&
        (originHost.startsWith('rowan-app-') || originHost === 'rowan-app.vercel.app');

      const isValidOrigin = originHost === expectedHost ||
        // Allow only THIS project's Vercel preview deployments
        isVercelPreview ||
        // Allow localhost in development
        (process.env.NODE_ENV === 'development' && originHost === 'localhost');

      if (!isValidOrigin) {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    }

    if (isApiRoute) {
      const pathname = req.nextUrl.pathname;
      const isCsrfExempt = CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
      const authHeader = req.headers.get('authorization');
      const hasBearerAuth = authHeader?.startsWith('Bearer ');

      if (!isCsrfExempt && !hasBearerAuth) {
        const csrfCookie = req.cookies.get('__csrf_token')?.value;
        const csrfHeader = req.headers.get(CSRF_HEADER_NAME);

        // Timing-safe comparison to prevent brute-forcing CSRF tokens
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
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }

        // SECURITY FIX (VULN-CSRF-001): Rotate CSRF token after each state-changing request.
        // Reduces the exploitation window from 24 hours to a single request.
        const newCsrfToken = generateCsrfToken();
        response.cookies.set('__csrf_token', newCsrfToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });
      }
    }
  }

  // Skip security headers in development to match next.config.mjs behavior
  if (process.env.NODE_ENV !== 'development') {
    // Add security headers with strengthened CSP for production only
    //
    // SECURITY NOTE: 'unsafe-inline' is required for Next.js hydration scripts and inline styles.
    // 'unsafe-eval' was removed (2026-02-05 audit FIX-104) — not needed with Next.js 15.5+ on Vercel.
    //
    // FUTURE IMPROVEMENT: Implement nonce-based CSP to also remove 'unsafe-inline'.
    // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://vercel.live https://static.cloudflareinsights.com;" +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://vercel.live https://vitals.vercel-insights.com https://va.vercel-scripts.com https://cdn.vercel-insights.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://api.polar.sh https://ipapi.co https://api.ipgeolocation.io https://api.edamam.com https://www.themealdb.com https://api.spoonacular.com https://api.open-meteo.com https://api.gemini.google.com https://www.googleapis.com https://exp.host data:;" +
      "frame-ancestors 'none'; " +
      "frame-src 'self' https://vercel.live;" +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "object-src 'none';"
    );

    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    response.headers.set('X-Frame-Options', 'DENY');

    response.headers.set('X-Content-Type-Options', 'nosniff');

    response.headers.set(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    );

    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self)'
    );

    response.headers.set(
      'X-XSS-Protection',
      '1; mode=block'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tasks/:path*',
    '/calendar/:path*',
    '/messages/:path*',
    '/reminders/:path*',
    '/shopping/:path*',
    '/meals/:path*',
    '/projects/:path*',
    '/recipes/:path*',
    '/goals/:path*',
    '/settings/:path*',
    '/invitations/:path*',
    '/feedback/:path*',
    '/expenses/:path*',
    '/budget/:path*',
    '/budget-setup/:path*',
    '/location/:path*',
    '/rewards/:path*',
    '/achievements/:path*',
    '/year-in-review/:path*',
    '/reports/:path*',
    '/admin/:path*', // Admin routes now protected
    '/login',
    '/signup',
    '/verify-email', // Email verification page
    // SECURITY: Include API routes for CSRF protection
    '/api/:path*',
  ],
};
