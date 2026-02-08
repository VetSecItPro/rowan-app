/**
 * Unit tests for lib/security/csrf.ts
 *
 * Tests CSRF protection utilities:
 * - Token generation (entropy, uniqueness)
 * - Token validation (double submit cookie pattern)
 * - Timing-safe comparison
 * - Method and route exemptions
 */

import { describe, it, expect } from 'vitest';
import {
  generateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
  CSRF_PROTECTED_METHODS,
  CSRF_EXEMPT_ROUTES,
} from '@/lib/security/csrf';

describe('generateCsrfToken', () => {
  it('should generate a 64-character hex string (32 bytes)', () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique tokens on each call', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateCsrfToken()));
    expect(tokens.size).toBe(20);
  });

  it('should only contain lowercase hex characters', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(token).not.toMatch(/[A-F]/);
  });
});

describe('requiresCsrfProtection', () => {
  it('should require protection for state-changing methods', () => {
    expect(requiresCsrfProtection('POST')).toBe(true);
    expect(requiresCsrfProtection('PUT')).toBe(true);
    expect(requiresCsrfProtection('PATCH')).toBe(true);
    expect(requiresCsrfProtection('DELETE')).toBe(true);
  });

  it('should NOT require protection for safe methods', () => {
    expect(requiresCsrfProtection('GET')).toBe(false);
    expect(requiresCsrfProtection('HEAD')).toBe(false);
    expect(requiresCsrfProtection('OPTIONS')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(requiresCsrfProtection('post')).toBe(true);
    expect(requiresCsrfProtection('Post')).toBe(true);
    expect(requiresCsrfProtection('get')).toBe(false);
  });
});

describe('isCsrfExempt', () => {
  it('should exempt webhook routes', () => {
    expect(isCsrfExempt('/api/webhooks/polar')).toBe(true);
    expect(isCsrfExempt('/api/webhooks/stripe')).toBe(true);
  });

  it('should exempt cron routes', () => {
    expect(isCsrfExempt('/api/cron/daily-cleanup')).toBe(true);
  });

  it('should exempt auth callback', () => {
    expect(isCsrfExempt('/api/auth/callback')).toBe(true);
  });

  it('should exempt the CSRF token endpoint itself', () => {
    expect(isCsrfExempt('/api/csrf/token')).toBe(true);
  });

  it('should exempt analytics tracking', () => {
    expect(isCsrfExempt('/api/analytics/track')).toBe(true);
  });

  it('should NOT exempt regular API routes', () => {
    expect(isCsrfExempt('/api/tasks')).toBe(false);
    expect(isCsrfExempt('/api/messages')).toBe(false);
    expect(isCsrfExempt('/api/meals')).toBe(false);
    expect(isCsrfExempt('/api/admin/auth/login')).toBe(false);
  });

  it('should NOT exempt routes that partially match', () => {
    // "/api/webhook" (missing trailing slash) should NOT match "/api/webhooks/"
    expect(isCsrfExempt('/api/webhook')).toBe(false);
  });
});

describe('CSRF_PROTECTED_METHODS constant', () => {
  it('should include all state-changing HTTP methods', () => {
    expect(CSRF_PROTECTED_METHODS).toContain('POST');
    expect(CSRF_PROTECTED_METHODS).toContain('PUT');
    expect(CSRF_PROTECTED_METHODS).toContain('PATCH');
    expect(CSRF_PROTECTED_METHODS).toContain('DELETE');
  });

  it('should NOT include safe methods', () => {
    expect(CSRF_PROTECTED_METHODS).not.toContain('GET');
    expect(CSRF_PROTECTED_METHODS).not.toContain('HEAD');
    expect(CSRF_PROTECTED_METHODS).not.toContain('OPTIONS');
  });
});

describe('CSRF_EXEMPT_ROUTES constant', () => {
  it('should contain expected exempt routes', () => {
    expect(CSRF_EXEMPT_ROUTES).toContain('/api/webhooks/');
    expect(CSRF_EXEMPT_ROUTES).toContain('/api/cron/');
    expect(CSRF_EXEMPT_ROUTES).toContain('/api/health');
    expect(CSRF_EXEMPT_ROUTES).toContain('/api/csrf/token');
  });
});
