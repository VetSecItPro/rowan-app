import { NextResponse } from 'next/server';

/**
 * Generates a per-request nonce for use in Content-Security-Policy script-src.
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

/**
 * Applies all security headers to the response (CSP, HSTS, X-Frame-Options, etc.).
 * Skipped in development to match next.config.mjs behavior.
 */
export function applySecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('x-nonce', nonce);

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    // SEV-1 fix (2026-05-01): dropped 'nonce-X' + 'strict-dynamic'.
    // Next.js statically prerenders most public pages at build time; their
    // <script> tags are baked into HTML without any request-time nonce.
    // 'strict-dynamic' then blocked every chunk and the homepage hydrated
    // to a blank screen for every visitor. 'self' + the explicit CDN
    // allowlist still blocks all cross-origin script injection, which is
    // the primary XSS-mitigation goal here. The nonce stays exported (and
    // x-nonce header set) so any future request-rendered route can opt in
    // by reading headers().get('x-nonce'), but the policy no longer
    // depends on every page being able to inject one.
    // 'unsafe-inline' is required because Next.js's hydration bootstrap is
    // emitted as inline <script>{...}</script> that pushes onto self.__next_f.
    // Without it React never hydrates. Modern browsers honor a nonce over
    // 'unsafe-inline' when both are present, so this is fine to combine if
    // we ever add nonces back for dynamic routes; for now the trade-off is
    // 'self' + explicit CDN allowlist to keep cross-origin injection blocked.
    `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://vercel.live https://static.cloudflareinsights.com;` +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://vercel.live https://vitals.vercel-insights.com https://va.vercel-scripts.com https://cdn.vercel-insights.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://api.polar.sh https://ipapi.co https://api.ipgeolocation.io https://api.edamam.com https://www.themealdb.com https://api.spoonacular.com https://api.open-meteo.com https://api.gemini.google.com https://www.googleapis.com https://exp.host data:;" +
    "worker-src 'self' blob:;" +
    "frame-ancestors 'none'; " +
    "frame-src 'self' https://vercel.live;" +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none';"
  );

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');
  response.headers.set('X-XSS-Protection', '1; mode=block');
}
