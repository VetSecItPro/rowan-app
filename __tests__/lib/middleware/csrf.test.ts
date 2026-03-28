/**
 * Unit tests for lib/middleware/csrf.ts
 *
 * Tests static asset detection and CSRF validation middleware logic
 * including origin checks, token matching, and token rotation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { isStaticAsset, checkCsrf } from '@/lib/middleware/csrf';

// Mock the csrf utility so generateCsrfToken returns a deterministic value
vi.mock('@/lib/security/csrf', () => ({
  CSRF_EXEMPT_ROUTES: [
    '/api/webhooks/',
    '/api/cron/',
    '/api/auth/callback',
    '/api/health',
    '/api/csrf/token',
  ],
  CSRF_HEADER_NAME: 'x-csrf-token',
  generateCsrfToken: vi.fn(() => 'new-rotated-token'),
}));

function makeRequest(
  url: string,
  method = 'GET',
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const req = new NextRequest(url, { method, headers: options.headers });
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      req.cookies.set(name, value);
    });
  }
  return req;
}

describe('isStaticAsset', () => {
  it('identifies _next/static paths', () => {
    expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true);
  });

  it('identifies _next/image paths', () => {
    expect(isStaticAsset('/_next/image?url=test')).toBe(true);
  });

  it('identifies /images paths', () => {
    expect(isStaticAsset('/images/logo.png')).toBe(true);
  });

  it('identifies /fonts paths', () => {
    expect(isStaticAsset('/fonts/inter.woff2')).toBe(true);
  });

  it('identifies known static files', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true);
    expect(isStaticAsset('/manifest.json')).toBe(true);
    expect(isStaticAsset('/sw.js')).toBe(true);
    expect(isStaticAsset('/rowan-logo.png')).toBe(true);
  });

  it('identifies image extensions', () => {
    expect(isStaticAsset('/some/path/image.png')).toBe(true);
    expect(isStaticAsset('/photo.jpg')).toBe(true);
    expect(isStaticAsset('/icon.svg')).toBe(true);
    expect(isStaticAsset('/sprite.ico')).toBe(true);
    expect(isStaticAsset('/banner.webp')).toBe(true);
  });

  it('does NOT match API routes', () => {
    expect(isStaticAsset('/api/tasks')).toBe(false);
    expect(isStaticAsset('/dashboard')).toBe(false);
    expect(isStaticAsset('/login')).toBe(false);
  });
});

describe('checkCsrf', () => {
  let response: NextResponse;

  beforeEach(() => {
    response = NextResponse.next();
  });

  it('allows GET requests without CSRF check', () => {
    const req = makeRequest('https://example.com/api/tasks', 'GET');
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('allows HEAD requests without CSRF check', () => {
    const req = makeRequest('https://example.com/api/tasks', 'HEAD');
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('blocks POST to API route with mismatched CSRF tokens', () => {
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
        'x-csrf-token': 'wrong-token',
      },
      cookies: { __csrf_token: 'correct-token' },
    });
    const result = checkCsrf(req, response);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('blocks POST to API route with missing CSRF cookie', () => {
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
        'x-csrf-token': 'some-token',
      },
    });
    const result = checkCsrf(req, response);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('blocks POST to API route with missing CSRF header', () => {
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
      },
      cookies: { __csrf_token: 'correct-token' },
    });
    const result = checkCsrf(req, response);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('allows POST to API route with matching CSRF tokens', () => {
    const token = 'a'.repeat(64);
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
        'x-csrf-token': token,
      },
      cookies: { __csrf_token: token },
    });
    const result = checkCsrf(req, response);
    expect(result).toBeNull();
  });

  it('rotates CSRF token after successful validation', () => {
    const token = 'b'.repeat(64);
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
        'x-csrf-token': token,
      },
      cookies: { __csrf_token: token },
    });
    checkCsrf(req, response);
    const newCookie = response.cookies.get('__csrf_token');
    expect(newCookie?.value).toBe('new-rotated-token');
  });

  it('skips CSRF for Bearer-authenticated API requests', () => {
    const req = makeRequest('https://example.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://example.com',
        host: 'example.com',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test',
      },
    });
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('skips CSRF for cron routes', () => {
    const req = makeRequest('https://example.com/api/cron/cleanup', 'POST', {
      headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('skips CSRF for webhook routes', () => {
    const req = makeRequest('https://example.com/api/webhooks/polar', 'POST', {
      headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('blocks POST with invalid origin', () => {
    const token = 'c'.repeat(64);
    const req = makeRequest('https://attacker.com/api/tasks', 'POST', {
      headers: {
        origin: 'https://attacker.com',
        host: 'example.com',
        'x-csrf-token': token,
      },
      cookies: { __csrf_token: token },
    });
    const result = checkCsrf(req, response);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('allows Vercel preview deployments matching rowan-app-* pattern', () => {
    const token = 'd'.repeat(64);
    const req = makeRequest('https://rowan-app-abc123.vercel.app/api/tasks', 'POST', {
      headers: {
        origin: 'https://rowan-app-abc123.vercel.app',
        host: 'rowan-app-abc123.vercel.app',
        'x-csrf-token': token,
      },
      cookies: { __csrf_token: token },
    });
    expect(checkCsrf(req, response)).toBeNull();
  });

  it('blocks arbitrary *.vercel.app origins', () => {
    const token = 'e'.repeat(64);
    const req = makeRequest('https://rowan-app-abc123.vercel.app/api/tasks', 'POST', {
      headers: {
        origin: 'https://evil-app.vercel.app',
        host: 'rowan-app-abc123.vercel.app',
        'x-csrf-token': token,
      },
      cookies: { __csrf_token: token },
    });
    const result = checkCsrf(req, response);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
