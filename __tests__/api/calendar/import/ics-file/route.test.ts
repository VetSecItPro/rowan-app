import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/calendar/import/ics-file/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/calendar', () => ({
  icsImportService: {
    validateICSContent: vi.fn(),
    importICSFile: vi.fn(),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SPACE_ID = '00000000-0000-4000-8000-000000000002';

const VALID_ICS_CONTENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Test Event
DTSTART:20260222T100000Z
DTEND:20260222T110000Z
END:VEVENT
END:VCALENDAR`;

function mockRateLimitOk() {
  return { success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 };
}

describe('/api/calendar/import/ics-file', () => {
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

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: VALID_ICS_CONTENT }),
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

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: VALID_ICS_CONTENT }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 413 when file content is too large', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        headers: { 'content-length': String(2 * 1024 * 1024) },
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: VALID_ICS_CONTENT }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toContain('too large');
    });

    it('should return 400 for invalid space_id format', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: 'not-a-uuid', ics_content: VALID_ICS_CONTENT }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 403 when user is not a space member', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
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

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: VALID_ICS_CONTENT }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Space not found or access denied');
    });

    it('should return 400 for invalid ICS content', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { icsImportService } = await import('@/lib/services/calendar');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { space_id: SPACE_ID, role: 'member' }, error: null }),
        }),
      } as any);

      vi.mocked(icsImportService.validateICSContent).mockReturnValue({
        valid: false,
        error: 'Missing VCALENDAR wrapper',
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: 'not valid ics' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid ICS file');
    });

    it('should import ICS file successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { icsImportService } = await import('@/lib/services/calendar');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue(mockRateLimitOk());
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { space_id: SPACE_ID, role: 'member' }, error: null }),
        }),
      } as any);

      vi.mocked(icsImportService.validateICSContent).mockReturnValue({
        valid: true,
        calendarName: 'My Calendar',
      } as any);

      vi.mocked(icsImportService.importICSFile).mockResolvedValue({
        success: true,
        eventsImported: 5,
      } as any);

      const request = new NextRequest('http://localhost/api/calendar/import/ics-file', {
        method: 'POST',
        body: JSON.stringify({ space_id: SPACE_ID, ics_content: VALID_ICS_CONTENT, file_name: 'calendar.ics' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events_imported).toBe(5);
      expect(data.calendar_name).toBe('My Calendar');
    });
  });
});
