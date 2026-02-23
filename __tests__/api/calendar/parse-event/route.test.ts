import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/calendar/parse-event/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/ai/event-parser-service', () => ({
  eventParserService: {
    parseEventText: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Redis to prevent real connection attempts
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}));

// Mock Ratelimit using a proper constructor function with static methods.
// vi.fn() cannot be used as a `new` constructor; use a regular function instead.
vi.mock('@upstash/ratelimit', () => {
  const mockLimit = vi.fn().mockResolvedValue({ success: true, remaining: 19, reset: Date.now() + 3600000 });

  function RatelimitMock() {
    return { limit: mockLimit };
  }
  RatelimitMock.slidingWindow = vi.fn(() => ({ type: 'slidingWindow' }));
  RatelimitMock.fixedWindow = vi.fn(() => ({ type: 'fixedWindow' }));
  RatelimitMock.tokenBucket = vi.fn(() => ({ type: 'tokenBucket' }));

  return { Ratelimit: RatelimitMock };
});

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('/api/calendar/parse-event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: JSON.stringify({ text: 'Team meeting tomorrow at 2pm' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for empty text field', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      // Send empty string to trigger the min(1, 'Text is required') Zod message
      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: JSON.stringify({ text: '' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Text is required');
    });

    it('should return 400 for text exceeding max length', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: JSON.stringify({ text: 'a'.repeat(10001) }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Text is too long');
    });

    it('should return 422 when parsing fails', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      vi.mocked(eventParserService.parseEventText).mockResolvedValue({
        success: false,
        error: 'Could not parse event from text',
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: JSON.stringify({ text: 'Lorem ipsum dolor sit amet' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe('Could not parse event from text');
    });

    it('should parse event text successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const mockParsedEvent = {
        title: 'Team Meeting',
        start_date: '2026-02-23T14:00:00Z',
        end_date: '2026-02-23T15:00:00Z',
        all_day: false,
      };

      vi.mocked(eventParserService.parseEventText).mockResolvedValue({
        success: true,
        data: mockParsedEvent,
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: JSON.stringify({ text: 'Team meeting tomorrow at 2pm', timezone: 'America/New_York' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event).toEqual(mockParsedEvent);
    });

    it('should return 400 for invalid JSON body', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/parse-event', {
        method: 'POST',
        body: 'not-valid-json',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });
});
