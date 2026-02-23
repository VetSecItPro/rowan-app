/**
 * Unit tests for lib/utils/app-url.ts
 *
 * Tests URL building utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAppUrl, buildAppUrl } from '@/lib/utils/app-url';

describe('getAppUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return canonical domain in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.vercel.app';

    const url = getAppUrl();

    expect(url).toBe('https://rowanapp.com');
  });

  it('should return env var in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    const url = getAppUrl();

    expect(url).toBe('http://localhost:3000');
  });

  it('should return localhost if env var not set in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_APP_URL;

    const url = getAppUrl();

    expect(url).toBe('http://localhost:3000');
  });

  it('should return canonical domain in test environment', () => {
    process.env.NODE_ENV = 'test';

    const url = getAppUrl();

    expect(url).toBe('http://localhost:3000');
  });
});

describe('buildAppUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should build URL with path', () => {
    const url = buildAppUrl('/signup');

    expect(url).toBe('https://rowanapp.com/signup');
  });

  it('should build URL with path and query params', () => {
    const url = buildAppUrl('/dashboard', { tab: 'tasks', filter: 'today' });

    expect(url).toBe('https://rowanapp.com/dashboard?tab=tasks&filter=today');
  });

  it('should build URL with path and no params', () => {
    const url = buildAppUrl('/about');

    expect(url).toBe('https://rowanapp.com/about');
  });

  it('should build URL with path and empty params object', () => {
    const url = buildAppUrl('/contact', {});

    expect(url).toBe('https://rowanapp.com/contact');
  });

  it('should skip empty param values', () => {
    const url = buildAppUrl('/search', { q: 'test', filter: '', sort: 'date' });

    expect(url).toBe('https://rowanapp.com/search?q=test&sort=date');
  });

  it('should handle params with special characters', () => {
    const url = buildAppUrl('/search', { q: 'hello world', tag: 'food & drink' });

    expect(url).toBe('https://rowanapp.com/search?q=hello+world&tag=food+%26+drink');
  });

  it('should handle absolute paths', () => {
    const url = buildAppUrl('/api/users/123');

    expect(url).toBe('https://rowanapp.com/api/users/123');
  });

  it('should handle paths without leading slash', () => {
    const url = buildAppUrl('dashboard');

    expect(url).toBe('https://rowanapp.com/dashboard');
  });

  it('should preserve path structure', () => {
    const url = buildAppUrl('/api/v1/users/profile');

    expect(url).toBe('https://rowanapp.com/api/v1/users/profile');
  });
});
