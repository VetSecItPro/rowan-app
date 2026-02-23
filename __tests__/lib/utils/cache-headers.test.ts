/**
 * Unit tests for lib/utils/cache-headers.ts
 *
 * Tests HTTP cache-control header utilities.
 */

import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  withCacheHeaders,
  withUserDataCache,
  withDynamicDataCache,
  withPublicDataCache,
  withNoCache,
} from '@/lib/utils/cache-headers';

describe('withCacheHeaders', () => {
  it('should add default private cache headers', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response);

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=0');
  });

  it('should add private cache with custom max-age', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, { maxAge: 300, isPrivate: true });

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=300');
  });

  it('should add public cache with max-age', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, { maxAge: 600, isPrivate: false });

    expect(result.headers.get('Cache-Control')).toBe('public, max-age=600');
  });

  it('should add s-maxage for public responses', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, {
      maxAge: 300,
      sMaxAge: 3600,
      isPrivate: false,
    });

    expect(result.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=3600');
  });

  it('should not add s-maxage for private responses', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, {
      maxAge: 300,
      sMaxAge: 3600,
      isPrivate: true,
    });

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=300');
  });

  it('should add stale-while-revalidate', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, {
      maxAge: 60,
      staleWhileRevalidate: 120,
      isPrivate: true,
    });

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=60, stale-while-revalidate=120');
  });

  it('should add must-revalidate directive', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, {
      maxAge: 60,
      mustRevalidate: true,
      isPrivate: true,
    });

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=60, must-revalidate');
  });

  it('should combine all directives', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withCacheHeaders(response, {
      maxAge: 300,
      sMaxAge: 600,
      staleWhileRevalidate: 900,
      isPrivate: false,
      mustRevalidate: true,
    });

    expect(result.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=600, stale-while-revalidate=900, must-revalidate'
    );
  });
});

describe('withUserDataCache', () => {
  it('should add user data cache preset', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withUserDataCache(response);

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=30, stale-while-revalidate=60');
  });

  it('should return the same response object', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withUserDataCache(response);

    expect(result).toBe(response);
  });
});

describe('withDynamicDataCache', () => {
  it('should add dynamic data cache preset', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withDynamicDataCache(response);

    expect(result.headers.get('Cache-Control')).toBe('private, max-age=5, stale-while-revalidate=30');
  });
});

describe('withPublicDataCache', () => {
  it('should add public data cache preset', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withPublicDataCache(response);

    expect(result.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );
  });
});

describe('withNoCache', () => {
  it('should add no-cache headers', () => {
    const response = NextResponse.json({ data: 'test' });
    const result = withNoCache(response);

    expect(result.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    expect(result.headers.get('Pragma')).toBe('no-cache');
    expect(result.headers.get('Expires')).toBe('0');
  });

  it('should override existing cache headers', () => {
    const response = NextResponse.json({ data: 'test' });
    response.headers.set('Cache-Control', 'public, max-age=3600');

    const result = withNoCache(response);

    expect(result.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
  });
});
