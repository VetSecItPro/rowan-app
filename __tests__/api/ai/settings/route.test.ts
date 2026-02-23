import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/ai/settings/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/constants/feature-flags', () => ({
  featureFlags: {
    isAICompanionEnabled: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai/conversation-persistence-service', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withDynamicDataCache: vi.fn((response) => response),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('/api/ai/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/ai/settings', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('AI companion is not enabled');
    });

    it('should return 401 when not authenticated', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/settings', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return settings successfully', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { getSettings } = await import('@/lib/services/ai/conversation-persistence-service');

      const mockSettings = {
        ai_enabled: true,
        voice_enabled: false,
        proactive_suggestions: true,
        morning_briefing: false,
        preferred_voice_lang: 'en-US',
      };

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(getSettings).mockResolvedValue(mockSettings as any);

      const request = new NextRequest('http://localhost/api/ai/settings', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockSettings);
    });
  });

  describe('PUT', () => {
    it('should return 403 when AI companion is disabled', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({ ai_enabled: false }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('AI companion is not enabled');
    });

    it('should return 401 when not authenticated', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({ ai_enabled: false }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when no valid fields are provided', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({ unknown_field: 'value', another_unknown: true }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields provided');
    });

    it('should update settings successfully with allowed fields', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { updateSettings } = await import('@/lib/services/ai/conversation-persistence-service');

      const updatedSettings = {
        ai_enabled: false,
        voice_enabled: true,
        proactive_suggestions: false,
        morning_briefing: true,
        preferred_voice_lang: 'es-ES',
      };

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(updateSettings).mockResolvedValue(updatedSettings as any);

      const request = new NextRequest('http://localhost/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({ ai_enabled: false, voice_enabled: true, morning_briefing: true }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(updatedSettings);
      expect(updateSettings).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        expect.objectContaining({ ai_enabled: false, voice_enabled: true, morning_briefing: true })
      );
    });

    it('should strip unknown fields and only update allowed fields', async () => {
      const { featureFlags } = await import('@/lib/constants/feature-flags');
      const { createClient } = await import('@/lib/supabase/server');
      const { updateSettings } = await import('@/lib/services/ai/conversation-persistence-service');

      vi.mocked(featureFlags.isAICompanionEnabled).mockReturnValue(true);
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);
      vi.mocked(updateSettings).mockResolvedValue({ ai_enabled: true } as any);

      const request = new NextRequest('http://localhost/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify({ ai_enabled: true, admin_override: true, evil_field: 'hack' }),
      });
      await PUT(request);

      // Should only pass ai_enabled, not the unknown fields
      expect(updateSettings).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        { ai_enabled: true }
      );
    });
  });
});
