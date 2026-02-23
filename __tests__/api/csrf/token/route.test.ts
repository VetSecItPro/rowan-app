import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/csrf/token/route';

// Mock dependencies
vi.mock('@/lib/security/csrf', () => ({
  generateCsrfToken: vi.fn(() => 'mock-csrf-token-123'),
  setCsrfCookie: vi.fn(),
  getCsrfTokenFromCookie: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

describe('/api/csrf/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/csrf/token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return existing token if present in cookie', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { getCsrfTokenFromCookie } = await import('@/lib/security/csrf');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(getCsrfTokenFromCookie).mockReturnValue('existing-token-456');

      const request = new NextRequest('http://localhost/api/csrf/token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBe('existing-token-456');
    });

    it('should generate new token if none exists', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { getCsrfTokenFromCookie, generateCsrfToken, setCsrfCookie } = await import('@/lib/security/csrf');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(getCsrfTokenFromCookie).mockReturnValue(null);
      vi.mocked(generateCsrfToken).mockReturnValue('new-token-789');

      const request = new NextRequest('http://localhost/api/csrf/token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBe('new-token-789');
      expect(setCsrfCookie).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { getCsrfTokenFromCookie } = await import('@/lib/security/csrf');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(getCsrfTokenFromCookie).mockImplementation(() => {
        throw new Error('Cookie error');
      });

      const request = new NextRequest('http://localhost/api/csrf/token', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate CSRF token');
    });
  });
});
