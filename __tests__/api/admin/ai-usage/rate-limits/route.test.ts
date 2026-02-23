import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/ai-usage/rate-limits/route';

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/utils/admin-auth', () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock('@/lib/services/ai/chat-orchestrator-service', () => ({
  getApiRequestStats: vi.fn(),
}));

describe('/api/admin/ai-usage/rate-limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage/rate-limits', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('returns 401 when admin auth fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: false,
        error: 'Admin authentication required',
      });

      const request = new NextRequest('http://localhost/api/admin/ai-usage/rate-limits', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Admin authentication required');
    });

    it('returns 200 with rate limit stats for authenticated admin', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { getApiRequestStats } = await import('@/lib/services/ai/chat-orchestrator-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      const mockStats = {
        rpm: 12,
        rpd: 350,
        rpm_limit: 60,
        rpd_limit: 1000,
        rpm_remaining: 48,
        rpd_remaining: 650,
      };

      vi.mocked(getApiRequestStats).mockReturnValue(mockStats as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage/rate-limits', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStats);
    });

    it('returns 200 with stats from getApiRequestStats', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { verifyAdminAuth } = await import('@/lib/utils/admin-auth');
      const { getApiRequestStats } = await import('@/lib/services/ai/chat-orchestrator-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      vi.mocked(verifyAdminAuth).mockResolvedValue({
        isValid: true,
        adminId: 'admin-1',
      });

      vi.mocked(getApiRequestStats).mockReturnValue({} as any);

      const request = new NextRequest('http://localhost/api/admin/ai-usage/rate-limits', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getApiRequestStats).toHaveBeenCalledOnce();
    });
  });
});
