import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/calendar/sync/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/calendar', () => ({
  calendarSyncService: {
    performSync: vi.fn(),
  },
}));

vi.mock('@/lib/validations/calendar-integration-schemas', () => ({
  ManualSyncRequestSchema: {
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

describe('/api/calendar/sync', () => {
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

      const request = new NextRequest('http://localhost/api/calendar/sync', {
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

      const request = new NextRequest('http://localhost/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when connection is not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { ManualSyncRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(ManualSyncRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        sync_type: 'incremental',
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/sync', {
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
      const { ManualSyncRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(ManualSyncRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        sync_type: 'incremental',
      });

      const mockConnection = { id: CONNECTION_ID, space_id: SPACE_ID, user_id: USER_ID, sync_status: 'connected' };

      const fromMock = vi.fn((table: string) => {
        if (table === 'calendar_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
          };
        }
        // space_members not found
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this calendar connection');
    });

    it('should return 400 when connection is disconnected', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { ManualSyncRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(ManualSyncRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        sync_type: 'incremental',
      });

      const mockConnection = { id: CONNECTION_ID, space_id: SPACE_ID, user_id: USER_ID, sync_status: 'disconnected' };
      const mockSpaceMember = { space_id: SPACE_ID, role: 'member' };

      const fromMock = vi.fn((table: string) => {
        if (table === 'calendar_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSpaceMember, error: null }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('disconnected');
    });

    it('should sync calendar successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { ManualSyncRequestSchema } = await import('@/lib/validations/calendar-integration-schemas');
      const { calendarSyncService } = await import('@/lib/services/calendar');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(ManualSyncRequestSchema.parse).mockReturnValue({
        connection_id: CONNECTION_ID,
        sync_type: 'incremental',
      });

      const mockConnection = {
        id: CONNECTION_ID,
        space_id: SPACE_ID,
        user_id: USER_ID,
        sync_status: 'connected',
        last_sync_at: null,
      };
      const mockSpaceMember = { space_id: SPACE_ID, role: 'member' };

      const fromMock = vi.fn((table: string) => {
        if (table === 'calendar_connections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSpaceMember, error: null }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      vi.mocked(calendarSyncService.performSync).mockResolvedValue({
        success: true,
        events_created: 3,
        events_updated: 1,
        events_deleted: 0,
        conflicts_detected: 0,
        errors: [],
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ connection_id: CONNECTION_ID, sync_type: 'incremental' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events_created).toBe(3);
    });
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest(
        `http://localhost/api/calendar/sync?connection_id=${CONNECTION_ID}`,
        { method: 'GET' }
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing connection_id', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/sync', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return sync logs successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());

      const mockConnection = { space_id: SPACE_ID, user_id: USER_ID };
      const mockSpaceMember = { id: 'member-1', role: 'member' };
      const mockSyncLogs = [
        { id: 'log-1', connection_id: CONNECTION_ID, sync_type: 'incremental', status: 'success' },
      ];

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
            single: vi.fn().mockResolvedValue({ data: mockSpaceMember, error: null }),
          };
        }
        if (table === 'calendar_sync_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockSyncLogs, error: null }),
          };
        }
        if (table === 'calendar_sync_conflicts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve: (val: { count: number }) => void) => resolve({ count: 0 })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: fromMock,
      } as any);

      const request = new NextRequest(
        `http://localhost/api/calendar/sync?connection_id=${CONNECTION_ID}`,
        { method: 'GET' }
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sync_logs).toBeDefined();
    });
  });
});
