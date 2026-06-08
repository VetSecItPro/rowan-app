import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Regression: connect routes must return 503 BEFORE any DB write when the
// provider's OAuth credentials aren't configured on this server. Previously the
// route created a `disconnected` calendar_connections row, then threw deeper in
// generateAuthUrl(), leaving an orphan row + a cryptic 500.
// ---------------------------------------------------------------------------
const { mockGetUser, mockFrom, mockIsGoogleConfigured, mockIsOutlookConfigured, mockRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockIsGoogleConfigured: vi.fn(),
  mockIsOutlookConfigured: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/services/calendar', () => ({
  googleCalendarService: {
    isConfigured: mockIsGoogleConfigured,
    generateAuthUrl: vi.fn(),
  },
  outlookCalendarService: {
    isConfigured: mockIsOutlookConfigured,
    generateAuthUrl: vi.fn(),
  },
}));

vi.mock('@/lib/validations/calendar-integration-schemas', () => ({
  ConnectCalendarRequestSchema: { parse: vi.fn((v) => v) },
}));

vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: mockRateLimit }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST as outlookPOST } from '@/app/api/calendar/connect/outlook/route';
import { POST as googlePOST } from '@/app/api/calendar/connect/google/route';

function makeRequest() {
  return new NextRequest('https://rowanapp.com/api/calendar/connect/outlook', {
    method: 'POST',
    body: JSON.stringify({ space_id: '00000000-0000-0000-0000-000000000001', sync_direction: 'bidirectional' }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('calendar connect config guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  describe('Outlook', () => {
    it('returns 503 and writes nothing when Microsoft OAuth is unconfigured', async () => {
      mockIsOutlookConfigured.mockReturnValue(false);
      const res = await outlookPOST(makeRequest());
      expect(res.status).toBe(503);
      // No DB access at all - the guard fires before space check or insert.
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('does not short-circuit with 503 when configured', async () => {
      mockIsOutlookConfigured.mockReturnValue(true);
      // space_members lookup returns no membership -> 403, proving we got PAST
      // the config guard into the normal flow.
      mockFrom.mockReturnValue({
        select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'none' } }) }) }) }),
      });
      const res = await outlookPOST(makeRequest());
      expect(res.status).not.toBe(503);
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('Google', () => {
    it('returns 503 and writes nothing when Google OAuth is unconfigured', async () => {
      mockIsGoogleConfigured.mockReturnValue(false);
      const res = await googlePOST(makeRequest());
      expect(res.status).toBe(503);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
