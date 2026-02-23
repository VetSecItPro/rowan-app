import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/calendar/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    getEvents: vi.fn(),
    createEvent: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifySpaceAccess: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/validations/calendar-event-schemas', () => ({
  createCalendarEventSchema: {
    parse: vi.fn(),
  },
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text) => text),
}));

vi.mock('@/lib/utils/cache-headers', () => ({
  withUserDataCache: vi.fn((response) => response),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const SPACE_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000001';

function mockRateLimitOk() {
  return { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
}

function mockAuthUser(userId = USER_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
}

describe('/api/calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(`http://localhost/api/calendar?space_id=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
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

      const request = new NextRequest(`http://localhost/api/calendar?space_id=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when space_id is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);

      const request = new NextRequest('http://localhost/api/calendar', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('space_id is required');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest(`http://localhost/api/calendar?space_id=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should return calendar events successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { calendarService } = await import('@/lib/services/calendar-service');

      const mockEvents = [
        { id: 'event-1', title: 'Team Meeting', start_date: '2026-02-22T10:00:00Z' },
        { id: 'event-2', title: 'Doctor Appointment', start_date: '2026-02-23T14:00:00Z' },
      ];

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(calendarService.getEvents).mockResolvedValue(mockEvents as any);

      const request = new NextRequest(`http://localhost/api/calendar?space_id=${SPACE_ID}`, { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEvents);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, title: 'New Event', start_date: '2026-02-22T10:00:00Z' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createCalendarEventSchema } = await import('@/lib/validations/calendar-event-schemas');
      const { ZodError, ZodIssueCode } = await import('zod');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);

      vi.mocked(createCalendarEventSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'undefined',
            path: ['title'],
            message: 'Required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 403 when user lacks space access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createCalendarEventSchema } = await import('@/lib/validations/calendar-event-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(createCalendarEventSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, title: 'New Event', start_date: '2026-02-22T10:00:00Z' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this space');
    });

    it('should create calendar event successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createCalendarEventSchema } = await import('@/lib/validations/calendar-event-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { calendarService } = await import('@/lib/services/calendar-service');

      const mockEvent = {
        id: '00000000-0000-4000-8000-000000000010',
        title: 'Team Meeting',
        space_id: SPACE_ID,
        start_date: '2026-02-22T10:00:00Z',
      };

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(createCalendarEventSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(calendarService.createEvent).mockResolvedValue(mockEvent as any);

      const request = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, title: 'Team Meeting', start_date: '2026-02-22T10:00:00Z' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('00000000-0000-4000-8000-000000000010');
    });

    it('should sanitize title, description, and location', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { createCalendarEventSchema } = await import('@/lib/validations/calendar-event-schemas');
      const { verifySpaceAccess } = await import('@/lib/services/authorization-service');
      const { calendarService } = await import('@/lib/services/calendar-service');
      const { sanitizePlainText } = await import('@/lib/sanitize');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue(mockAuthUser() as any);
      vi.mocked(createCalendarEventSchema.parse).mockReturnValue(undefined);
      vi.mocked(verifySpaceAccess).mockResolvedValue(undefined);
      vi.mocked(calendarService.createEvent).mockResolvedValue({ id: 'event-1' } as any);

      const request = new NextRequest('http://localhost/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          space_id: SPACE_ID,
          title: 'Team Meeting',
          description: 'Discuss Q1 goals',
          location: 'Conference Room A',
          start_date: '2026-02-22T10:00:00Z',
        }),
      });
      await POST(request);

      expect(sanitizePlainText).toHaveBeenCalledWith('Team Meeting');
      expect(sanitizePlainText).toHaveBeenCalledWith('Discuss Q1 goals');
      expect(sanitizePlainText).toHaveBeenCalledWith('Conference Room A');
    });
  });
});
