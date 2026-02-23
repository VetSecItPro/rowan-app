import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/ai/data/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const CONV_ID_1 = '00000000-0000-4000-8000-000000000050';
const CONV_ID_2 = '00000000-0000-4000-8000-000000000051';

describe('/api/ai/data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/data', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should export AI data successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockConversations = [
        { id: CONV_ID_1, title: 'Morning chat', created_at: '2026-02-22T09:00:00Z' },
        { id: CONV_ID_2, title: 'Task help', created_at: '2026-02-22T14:00:00Z' },
      ];
      const mockMessages = [
        { id: 'msg-1', conversation_id: CONV_ID_1, role: 'user', content: 'Hello', created_at: '2026-02-22T09:00:01Z' },
        { id: 'msg-2', conversation_id: CONV_ID_1, role: 'assistant', content: 'Hi!', created_at: '2026-02-22T09:00:02Z' },
      ];
      const mockSettings = { ai_enabled: true, voice_enabled: false };
      const mockUsage = [{ date: '2026-02-22', input_tokens: 1000, output_tokens: 500 }];

      const fromMock = vi.fn((table: string) => {
        if (table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockConversations, error: null }),
          };
        }
        if (table === 'ai_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          };
        }
        if (table === 'ai_user_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          };
        }
        if (table === 'ai_usage_daily') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockUsage, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/ai/data', { method: 'GET' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');

      const text = await response.text();
      const exportData = JSON.parse(text);
      expect(exportData.user_id).toBe(USER_ID);
      expect(exportData.total_conversations).toBe(2);
      expect(exportData.conversations).toHaveLength(2);
    });

    it('should return 500 when conversation fetch fails', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/ai/data', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to export data');
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/ai/data', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete all AI data successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      const mockConversations = [{ id: CONV_ID_1 }, { id: CONV_ID_2 }];

      const fromMock = vi.fn((table: string) => {
        if (table === 'ai_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            then: vi.fn((resolve: (val: { data: typeof mockConversations }) => void) =>
              resolve({ data: mockConversations })
            ),
            delete: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'ai_messages') {
          return {
            delete: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'ai_usage_daily') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'ai_user_settings') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: vi.fn((resolve: (val: { data: unknown[] }) => void) => resolve({ data: [] })),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/ai/data', { method: 'DELETE' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBeDefined();
      expect(data.deleted.settings_reset).toBe(true);
    });
  });
});
