import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/recipe/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/services/storage-service', () => ({ uploadRecipeImage: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/utils/file-validation', () => ({
  validateImageMagicBytes: vi.fn(),
  isFormatAllowed: vi.fn(),
  ALLOWED_RECIPE_FORMATS: ['jpeg', 'png', 'webp', 'gif', 'avif', 'heic'],
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/services/feature-access-service', () => ({ canAccessFeature: vi.fn() }));
vi.mock('@/lib/middleware/subscription-check', () => ({
  buildUpgradeResponse: vi.fn(() => new Response(JSON.stringify({ error: 'upgrade' }), { status: 402 })),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry-utils', () => ({ setSentryUser: vi.fn() }));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

describe('/api/upload/recipe', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const fd = new FormData();
      fd.append('file', new File(['x'], 'img.png', { type: 'image/png' }));
      const req = new NextRequest('http://localhost/api/upload/recipe', { method: 'POST', body: fd });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('returns 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as any);

      const fd = new FormData();
      fd.append('file', new File(['x'], 'img.png', { type: 'image/png' }));
      const req = new NextRequest('http://localhost/api/upload/recipe', { method: 'POST', body: fd });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file provided', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);

      const req = new NextRequest('http://localhost/api/upload/recipe', { method: 'POST', body: new FormData() });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 200 with URL and path on success', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { canAccessFeature } = await import('@/lib/services/feature-access-service');
      const { validateImageMagicBytes, isFormatAllowed } = await import('@/lib/utils/file-validation');
      const { uploadRecipeImage } = await import('@/lib/services/storage-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      } as any);
      vi.mocked(canAccessFeature).mockResolvedValue({ allowed: true, tier: 'pro' } as any);
      vi.mocked(validateImageMagicBytes).mockResolvedValue({ valid: true, format: 'jpeg' });
      vi.mocked(isFormatAllowed).mockReturnValue(true);
      vi.mocked(uploadRecipeImage).mockResolvedValue({ success: true, url: 'https://cdn.example.com/recipe.jpg', path: 'recipes/abc.jpg' } as any);

      const fd = new FormData();
      fd.append('file', new File(['x'], 'recipe.jpg', { type: 'image/jpeg' }));
      const req = new NextRequest('http://localhost/api/upload/recipe', { method: 'POST', body: fd });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toContain('cdn.example.com');
    });
  });
});
