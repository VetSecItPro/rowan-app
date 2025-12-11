import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';

export async function middleware(req: NextRequest) {
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
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
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

  // Admin routes - require admin authentication
  const isAdminPath = req.nextUrl.pathname.startsWith('/admin');
  const isAdminLoginPath = req.nextUrl.pathname === '/admin/login';

  if (isAdminPath && !isAdminLoginPath) {
    // Verify admin session
    const adminSessionCookie = req.cookies.get('admin-session')?.value;

    if (!adminSessionCookie) {
      // No admin session - redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    try {
      // Decrypt and validate admin session (async with Web Crypto API)
      const sessionData = await decryptSessionData(adminSessionCookie);

      if (!validateSessionData(sessionData)) {
        // Invalid or expired session - redirect to admin login
        const response = NextResponse.redirect(new URL('/admin/login', req.url));
        // Clear invalid cookie
        response.cookies.delete('admin-session');
        return response;
      }

      // Admin session valid - continue
    } catch (error) {
      // Decryption failed - invalid session
      console.error('Admin session validation failed:', error);
      const response = NextResponse.redirect(new URL('/admin/login', req.url));
      response.cookies.delete('admin-session');
      return response;
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

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check beta access expiration for logged-in users
  if (isProtectedPath && session?.user?.email) {
    try {
      const { data: isValid, error: rpcError } = await supabase.rpc('is_beta_access_valid', {
        user_email: session.user.email
      });

      // SECURITY: Fail-closed - if we can't verify, deny access
      // But allow a grace period for transient errors
      if (rpcError) {
        console.error('Beta validation RPC error:', rpcError);
        // For database errors, redirect to an error page instead of allowing access
        // This prevents expired beta users from gaining access during DB issues
        const errorUrl = new URL('/error?code=beta_check_failed', req.url);
        return NextResponse.redirect(errorUrl);
      }

      if (isValid === false) {
        // Beta access expired - redirect to beta-expired page
        await supabase.auth.signOut();
        const redirectUrl = new URL('/beta-expired', req.url);
        const res = NextResponse.redirect(redirectUrl);
        res.cookies.delete('sb-access-token');
        res.cookies.delete('sb-refresh-token');
        return res;
      }
    } catch (error) {
      console.error('Beta validation exception:', error);
      // SECURITY: Fail-closed on unexpected errors
      const errorUrl = new URL('/error?code=beta_check_error', req.url);
      return NextResponse.redirect(errorUrl);
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
      const isValidOrigin = originHost === expectedHost ||
        // Allow Vercel preview deployments
        originHost.endsWith('.vercel.app') ||
        // Allow localhost in development
        (process.env.NODE_ENV === 'development' && originHost === 'localhost');

      if (!isValidOrigin) {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    }
  }

  // Skip security headers in development to match next.config.mjs behavior
  if (process.env.NODE_ENV !== 'development') {
    // Add security headers with strengthened CSP for production only
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' https: wss: data: https://*.supabase.co wss://*.supabase.co https://vercel.live https://api.gemini.google.com https://*.ingest.sentry.io https://*.upstash.io https://www.themealdb.com https://api.spoonacular.com https://api.edamam.com; " +
      "frame-ancestors 'none'; " +
      "frame-src 'self' https://vercel.live; " +
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
    // SECURITY: Include API routes for CSRF protection
    '/api/:path*',
  ],
};
