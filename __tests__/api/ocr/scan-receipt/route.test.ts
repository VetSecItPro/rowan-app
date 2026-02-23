import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ocr/scan-receipt/route';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/utils/file-validation', () => ({
  validateImageMagicBytes: vi.fn(),
  isFormatAllowed: vi.fn(),
  ALLOWED_RECEIPT_FORMATS: ['jpeg', 'png', 'webp', 'tiff', 'bmp'],
}));
const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    };
  }),
}));

function makeRateLimit(success: boolean) {
  return { success, limit: 60, remaining: success ? 59 : 0, reset: Date.now() + 60000 };
}

function makeSupabase(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'unauth' },
      }),
    },
  };
}

function makeImageFile(mimeType = 'image/jpeg', size = 1024): File {
  const bytes = new Uint8Array(size).fill(0);
  return new File([bytes], 'receipt.jpg', { type: mimeType });
}

describe('/api/ocr/scan-receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: GOOGLE_GEMINI_API_KEY is present
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as any);

      const formData = new FormData();
      formData.append('image', makeImageFile());

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(false));

      const formData = new FormData();
      formData.append('image', makeImageFile());

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      expect(res.status).toBe(429);
    });

    it('returns 400 when no image file is provided', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const formData = new FormData();
      // No 'image' field appended

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/no image/i);
    });

    it('returns 400 when file is not an image MIME type', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));

      const formData = new FormData();
      formData.append('image', new File(['data'], 'doc.pdf', { type: 'application/pdf' }));

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/must be an image/i);
    });

    it('returns 400 when magic bytes validation fails', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { validateImageMagicBytes } = await import('@/lib/utils/file-validation');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(validateImageMagicBytes).mockResolvedValue({ valid: false, format: null });

      const formData = new FormData();
      formData.append('image', makeImageFile());

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/valid image/i);
    });

    it('returns 400 when image format is not in allowed list', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { validateImageMagicBytes, isFormatAllowed } = await import('@/lib/utils/file-validation');
      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(validateImageMagicBytes).mockResolvedValue({ valid: true, format: 'gif' });
      vi.mocked(isFormatAllowed).mockReturnValue(false);

      const formData = new FormData();
      formData.append('image', makeImageFile('image/gif'));

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/not allowed/i);
    });

    it('returns OCR result on successful scan', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { validateImageMagicBytes, isFormatAllowed } = await import('@/lib/utils/file-validation');

      vi.mocked(createClient).mockResolvedValue(makeSupabase({ id: 'user-1' }) as any);
      vi.mocked(checkGeneralRateLimit).mockResolvedValue(makeRateLimit(true));
      vi.mocked(validateImageMagicBytes).mockResolvedValue({ valid: true, format: 'jpeg' });
      vi.mocked(isFormatAllowed).mockReturnValue(true);

      const mockJsonResponse = JSON.stringify({
        merchant_name: 'Test Store',
        total_amount: 45.99,
        receipt_date: '2026-02-22',
        category: 'Groceries',
        confidence: 90,
      });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => mockJsonResponse },
      });

      const formData = new FormData();
      formData.append('image', makeImageFile());

      const res = await POST(new NextRequest('http://localhost/api/ocr/scan-receipt', {
        method: 'POST',
        body: formData,
      }));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.merchant_name).toBe('Test Store');
      expect(data.total_amount).toBe(45.99);
      expect(data.category).toBe('Groceries');
    });
  });
});
