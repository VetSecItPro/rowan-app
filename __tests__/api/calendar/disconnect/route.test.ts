import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/calendar/disconnect/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/validations/calendar-integration-schemas', () => ({
  DisconnectCalendarRequestSchema: {
    parse: vi.fn(),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const CONNECTION_ID = '00000000-0000-4000-8000-000000000099';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const SPACE_ID = '00000000-0000-4000-8000-000000000002';

function mockRateLimitOk() {
  return { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
}

describe('/api/calendar/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for validation error', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { DisconnectCalendarRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');
      const { ZodError, ZodIssueCode } = await import('zod');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      vi.mocked(DisconnectCalendarRequestSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'undefined',
            path: ['connection_id'],
            message: 'Required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 404 when connection is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { DisconnectCalendarRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(DisconnectCalendarRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        delete_synced_events: false,
      });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(mockChain),
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Calendar connection not found');
    });

    it('should return 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { DisconnectCalendarRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(DisconnectCalendarRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        delete_synced_events: false,
      });

      const mockConnection = { id: CONNECTION_ID, space_id: SPACE_ID, user_id: 'other-user', provider: 'google' };

      const fromMock = vi.fn((table: string) => {
        if (table === 'calendar_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
          };
        }
        if (table === 'space_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should disconnect calendar successfully as the connection owner', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { DisconnectCalendarRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(DisconnectCalendarRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        delete_synced_events: false,
      });

      const mockConnection = { id: CONNECTION_ID, space_id: SPACE_ID, user_id: USER_ID, provider: 'google' };
      const mockSpaceMember = { id: 'member-1', role: 'member' };

      const fromMock = vi.fn((table: string) => {
        if (table === 'calendar_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
            delete: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'space_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSpaceMember, error: null }),
          };
        }
        // For cleanup tables (webhook_subscriptions, sync_queue, etc.)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.provider).toBe('google');
    });
  });
});
