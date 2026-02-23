import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/geographic/detect/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/geographic-detection-service', () => ({
  geographicDetectionService: {
    getClientIP: vi.fn(),
    detectLocation: vi.fn(),
    shouldShowCCPANotice: vi.fn(),
  },
}));

vi.mock('@/lib/services/ccpa-service', () => ({
  ccpaService: {
    getOptOutStatus: vi.fn(),
    setOptOutStatus: vi.fn(),
    logCCPAAction: vi.fn(),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('/api/geographic/detect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/geographic/detect');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 400 when IP is unknown', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('unknown');

      const request = new NextRequest('http://localhost/api/geographic/detect');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unable to determine IP');
      expect(data.showCCPANotice).toBe(true);
    });

    it('should return 500 when detection fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('8.8.8.8');
      vi.mocked(geographicDetectionService.detectLocation).mockResolvedValue({
        success: false,
        error: 'Detection failed',
      });

      const request = new NextRequest('http://localhost/api/geographic/detect');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.showCCPANotice).toBe(true);
    });

    it('should return location and CCPA notice flag on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('1.2.3.4');
      vi.mocked(geographicDetectionService.detectLocation).mockResolvedValue({
        success: true,
        data: { city: 'Austin', state: 'Texas', country: 'US', isCaliforniaResident: false },
        confidence: 0.9,
      });
      vi.mocked(geographicDetectionService.shouldShowCCPANotice).mockReturnValue(false);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/geographic/detect');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.location.city).toBe('Austin');
      expect(data.data.showCCPANotice).toBe(false);
    });
  });

  describe('POST', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/geographic/detect', {
        method: 'POST',
        body: JSON.stringify({ declaredResident: true }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/geographic/detect', {
        method: 'POST',
        body: JSON.stringify({ declaredResident: true }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 400 when declaredResident is not boolean', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/geographic/detect', {
        method: 'POST',
        body: JSON.stringify({ declaredResident: 'yes' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('boolean');
    });

    it('should update California residency status successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { geographicDetectionService } = await import('@/lib/services/geographic-detection-service');
      const { ccpaService } = await import('@/lib/services/ccpa-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(geographicDetectionService.getClientIP).mockReturnValue('8.8.8.8');
      vi.mocked(ccpaService.setOptOutStatus).mockResolvedValue({ success: true, data: { california_resident: true } });
      vi.mocked(ccpaService.logCCPAAction).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/geographic/detect', {
        method: 'POST',
        body: JSON.stringify({ declaredState: 'CA', declaredResident: true }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('CA resident');
    });
  });
});
