/**
 * Next.js Edge Middleware
 *
 * SECURITY LAYER: Authentication, Authorization, CSRF Protection, Security Headers
 *
 * This middleware runs on ALL requests matching the config.matcher and provides:
 * 1. Authentication - Validates Supabase sessions for protected routes
 * 2. Authorization - Enforces admin access with SSO and encrypted session cookies
 * 3. Beta Access Control - Validates beta program eligibility and expiration
 * 4. CSRF Protection - Validates Origin headers on state-changing requests
 * 5. Security Headers - CSP, HSTS, X-Frame-Options, etc.
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
import { CSRF_EXEMPT_ROUTES, CSRF_HEADER_NAME } from '@/lib/security/csrf';

/** Admin session duration in seconds (24 hours) - must match login route */
const ADMIN_SESSION_DURATION = 24 * 60 * 60;

/** Beta validation cache duration in seconds (1 hour) */
const BETA_CACHE_DURATION = 60 * 60;

/** User session cookie duration: 1 year (persistent login like Facebook/Instagram) */
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 31536000 seconds

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

  const { data: { session } } = await supabase.auth.getSession();

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
        const redirectUrl = new URL('/verify-email', req.url);
        redirectUrl.searchParams.set('email', session.user.email || '');
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // Check beta access expiration for logged-in users
  // PERFORMANCE: Use cached result from cookie to avoid RPC on every request
  if (isProtectedPath && session?.user?.email) {
    const betaCacheCookie = req.cookies.get('beta-validation')?.value;
    let needsValidation = true;

    // Check if we have a valid cached result
    if (betaCacheCookie) {
      try {
        const cacheData = JSON.parse(betaCacheCookie);
        // Cache is valid if: same user, not expired, and was previously valid
        if (
          cacheData.email === session.user.email &&
          cacheData.expiresAt > Date.now() &&
          cacheData.isValid === true
        ) {
          needsValidation = false;
        }
      } catch {
        // Invalid cookie, will revalidate
      }
    }

    if (needsValidation) {
      try {
        const { data: isValid, error: rpcError } = await supabase.rpc('is_beta_access_valid', {
          user_email: session.user.email
        });

        // SECURITY: Fail-closed - if we can't verify, deny access
        // This prevents expired beta users from gaining access during DB issues
        if (rpcError) {
          logger.error('Beta validation RPC error', rpcError, {
            component: 'middleware',
            action: 'beta_validation',
            path: req.nextUrl.pathname,
            userEmail: session.user.email,
          });
          // For database errors, redirect to an error page instead of allowing access
          const errorUrl = new URL('/error?code=beta_check_failed', req.url);
          return NextResponse.redirect(errorUrl);
        }

        if (isValid === false) {
          // Beta access expired - redirect to beta-expired page
          // Clear the cache cookie
          response.cookies.delete('beta-validation');
          await supabase.auth.signOut();
          const redirectUrl = new URL('/beta-expired', req.url);
          const res = NextResponse.redirect(redirectUrl);
          res.cookies.delete('sb-access-token');
          res.cookies.delete('sb-refresh-token');
          res.cookies.delete('beta-validation');
          return res;
        }

        // Cache the successful validation result
        const cacheData = {
          email: session.user.email,
          isValid: true,
          expiresAt: Date.now() + (BETA_CACHE_DURATION * 1000),
        };
        response.cookies.set('beta-validation', JSON.stringify(cacheData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: BETA_CACHE_DURATION,
          path: '/',
        });
      } catch (error) {
        // SECURITY: Fail-closed on unexpected errors
        logger.error('Beta validation exception', error, {
          component: 'middleware',
          action: 'beta_validation',
          path: req.nextUrl.pathname,
        });
        const errorUrl = new URL('/error?code=beta_check_error', req.url);
        return NextResponse.redirect(errorUrl);
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

        if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
    }
  }

  // Skip security headers in development to match next.config.mjs behavior
  if (process.env.NODE_ENV !== 'development') {
    // Add security headers with strengthened CSP for production only
    //
    // SECURITY NOTE: 'unsafe-inline' and 'unsafe-eval' are required due to Next.js framework limitations:
    // - 'unsafe-inline': Required for Next.js hydration scripts and inline styles (CSS-in-JS)
    // - 'unsafe-eval': Required for some bundled libraries and webpack runtime
    //
    // FUTURE IMPROVEMENT: Next.js 13.4+ supports experimental nonce-based CSP via:
    // - experimental.appDocumentPreloading in next.config.js
    // - Using generateNonce() in middleware and passing to Script components
    // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    //
    // Priority: Medium - Implement when Next.js nonce support stabilizes
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live https://static.cloudflareinsights.com https://js.stripe.com;" +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' https: wss: data: https://*.supabase.co wss://*.supabase.co https://vercel.live https://api.gemini.google.com https://*.ingest.sentry.io https://*.upstash.io https://www.themealdb.com https://api.spoonacular.com https://api.edamam.com https://api.stripe.com;" +
      "frame-ancestors 'none'; " +
      "frame-src 'self' https://vercel.live https://js.stripe.com https://hooks.stripe.com;" +
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
      'camera=(), microphone=(), geolocation=()'
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
    '/admin/:path*', // Admin routes now protected
    '/login',
    '/signup',
    '/verify-email', // Email verification page
    // SECURITY: Include API routes for CSRF protection
    '/api/:path*',
  ],
};
