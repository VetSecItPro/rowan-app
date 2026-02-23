/**
 * Unit tests for lib/utils/admin-auth.ts
 *
 * Tests verifyAdminAuth (header path + cookie path) and
 * the withAdminAuth higher-order function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/utils/safe-cookies', () => ({
  safeCookiesAsync: vi.fn(),
}));

vi.mock('@/lib/utils/session-crypto-edge', () => ({
  decryptSessionData: vi.fn(),
  validateSessionData: vi.fn(),
}));

import { verifyAdminAuth, withAdminAuth } from '@/lib/utils/admin-auth';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';

// Helper to build a NextRequest with custom headers
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/admin/test', { headers });
}

// Helper to build a cookie store stub
function makeCookieStore(sessionValue?: string) {
  return {
    get: vi.fn((name: string) => {
      if (name === 'admin-session' && sessionValue !== undefined) {
        return { name, value: sessionValue };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(() => []),
  };
}

describe('verifyAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Header path ---

  it('should return isValid=true when x-admin-verified header is set with an admin ID', async () => {
    const request = makeRequest({
      'x-admin-verified': 'true',
      'x-admin-id': 'admin-abc',
    });

    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(true);
    expect(result.adminId).toBe('admin-abc');
  });

  it('should ignore the header path when x-admin-id is missing', async () => {
    // Only x-admin-verified without x-admin-id falls through to cookie path
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore(undefined) as never);

    const request = makeRequest({ 'x-admin-verified': 'true' });
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should ignore the header path when x-admin-verified is not "true"', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore(undefined) as never);

    const request = makeRequest({
      'x-admin-verified': 'false',
      'x-admin-id': 'admin-abc',
    });
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
  });

  // --- Cookie path ---

  it('should return isValid=false when no admin-session cookie is present', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore(undefined) as never);

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Admin authentication required');
  });

  it('should return isValid=false when the session cookie value is empty', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore('') as never);

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Admin authentication required');
  });

  it('should return isValid=true when cookie decrypts and validates successfully', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore('encrypted-token') as never);
    vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-xyz' });
    vi.mocked(validateSessionData).mockReturnValue(true);

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(true);
    expect(result.adminId).toBe('admin-xyz');
  });

  it('should return isValid=false when validateSessionData returns false (expired session)', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore('encrypted-token') as never);
    vi.mocked(decryptSessionData).mockResolvedValue({ adminId: 'admin-xyz', expiresAt: 0 });
    vi.mocked(validateSessionData).mockReturnValue(false);

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Session expired or invalid');
  });

  it('should return isValid=false when decryptSessionData throws', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore('bad-token') as never);
    vi.mocked(decryptSessionData).mockRejectedValue(new Error('Decryption failed'));

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid session');
  });

  it('should return isValid=false when safeCookiesAsync throws', async () => {
    vi.mocked(safeCookiesAsync).mockRejectedValue(new Error('Cookies unavailable'));

    const request = makeRequest();
    const result = await verifyAdminAuth(request);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid session');
  });
});

describe('withAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the handler with the request and adminId when auth is valid', async () => {
    const request = makeRequest({
      'x-admin-verified': 'true',
      'x-admin-id': 'admin-123',
    });
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(request);

    expect(handler).toHaveBeenCalledWith(request, 'admin-123');
    expect(response.status).toBe(200);
  });

  it('should return 401 when auth fails', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore(undefined) as never);

    const request = makeRequest();
    const handler = vi.fn();
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should include the error message in the 401 response body', async () => {
    vi.mocked(safeCookiesAsync).mockResolvedValue(makeCookieStore(undefined) as never);

    const request = makeRequest();
    const wrapped = withAdminAuth(vi.fn());
    const response = await wrapped(request);
    const body = await response.json();

    expect(body.error).toBeDefined();
    expect(typeof body.error).toBe('string');
  });

  it('should propagate the handler return value on success', async () => {
    const request = makeRequest({
      'x-admin-verified': 'true',
      'x-admin-id': 'admin-abc',
    });
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ users: ['a', 'b'] }), { status: 200 })
    );
    const wrapped = withAdminAuth(handler);
    const response = await wrapped(request);

    expect(response.status).toBe(200);
  });
});
