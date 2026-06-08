import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const { mockGetUser, mockIsGoogleConfigured, mockIsOutlookConfigured, mockRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsGoogleConfigured: vi.fn(),
  mockIsOutlookConfigured: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('@/lib/services/calendar', () => ({
  googleCalendarService: { isConfigured: mockIsGoogleConfigured },
  outlookCalendarService: { isConfigured: mockIsOutlookConfigured },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: mockRateLimit,
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from '@/app/api/calendar/capabilities/route';

function makeRequest() {
  return new NextRequest('https://rowanapp.com/api/calendar/capabilities');
}

describe('GET /api/calendar/capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockIsGoogleConfigured.mockReturnValue(true);
    mockIsOutlookConfigured.mockReturnValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it('reflects each OAuth provider isConfigured() result', async () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    mockIsOutlookConfigured.mockReturnValue(false);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.capabilities.google).toBe(true);
    expect(body.capabilities.outlook).toBe(false);
  });

  it('always reports apple/ics/cozi as available (no server config needed)', async () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    mockIsOutlookConfigured.mockReturnValue(false);
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.capabilities.apple).toBe(true);
    expect(body.capabilities.ics).toBe(true);
    expect(body.capabilities.cozi).toBe(true);
  });
});
