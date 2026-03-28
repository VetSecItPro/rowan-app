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
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://vercel.live https://static.cloudflareinsights.com;` +
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
