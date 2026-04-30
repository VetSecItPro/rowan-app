import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import {
  parseUserAgent,
  formatLastActive,
  getLocationFromIP,
  getUserSessions,
  revokeSession,
  updateSessionActivity,
} from '@/lib/services/session-tracking-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseUserAgent - device type detection', () => {
  it('detects iPhone as mobile + Safari', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    // device_type detected as mobile via /iphone/. OS is reported as macOS because
    // 'Mac OS X' substring matches first - this is a known quirk of the source.
    expect(result.device_type).toBe('mobile');
    expect(result.browser).toBe('Safari');
    expect(result.device_name).toContain('iPhone');
  });

  it('detects iPad as tablet device', () => {
    // No "mobile" or "iphone" in this UA - hits the tablet/ipad branch.
    // Note: source matches 'mac os x' first for OS detection, so iPad UAs
    // containing "Mac OS X" are reported as os=macOS. Pin observed behavior.
    const result = parseUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1'
    );
    expect(result.device_type).toBe('tablet');
    expect(result.device_name).toContain('iPad');
  });

  it('detects Chrome on Windows desktop', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    );
    expect(result.device_type).toBe('desktop');
    expect(result.browser).toBe('Chrome');
    expect(result.os).toBe('Windows');
    // 10.0 -> "11" via the version map
    expect(result.os_version).toBe('11');
  });

  it('detects Edge browser', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0'
    );
    expect(result.browser).toBe('Edge');
  });

  it('detects Firefox on Linux', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
    );
    expect(result.browser).toBe('Firefox');
    expect(result.os).toBe('Linux');
  });

  it('detects Android mobile + Chrome', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
    );
    expect(result.device_type).toBe('mobile');
    expect(result.os).toBe('Android');
    expect(result.os_version).toBe('14');
    expect(result.browser).toBe('Chrome');
  });

  it('detects MacBook Pro on macOS', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15 macbook pro'
    );
    expect(result.os).toBe('macOS');
    expect(result.device_name).toContain('MacBook Pro');
  });

  it('returns Unknown for empty user agent', () => {
    const result = parseUserAgent('');
    expect(result.browser).toBe('Unknown');
    expect(result.os).toBe('Unknown');
    expect(result.device_type).toBe('desktop'); // default
  });
});

describe('formatLastActive', () => {
  it('returns "Active now" for very recent timestamps', () => {
    expect(formatLastActive(new Date().toISOString())).toBe('Active now');
  });

  it('returns minutes for sub-hour timestamps', () => {
    const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatLastActive(t)).toMatch(/5 minutes ago/);
  });

  it('singularizes 1 minute', () => {
    const t = new Date(Date.now() - 60 * 1000 - 5000).toISOString();
    expect(formatLastActive(t)).toBe('1 minute ago');
  });

  it('returns hours for sub-day timestamps', () => {
    const t = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(t)).toMatch(/3 hours ago/);
  });

  it('returns days for older timestamps', () => {
    const t = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatLastActive(t)).toMatch(/5 days ago/);
  });
});

describe('getLocationFromIP', () => {
  it('returns nulls for anonymous IP without making HTTP call', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as never);
    const result = await getLocationFromIP('anonymous');
    expect(result).toEqual({
      ip_address: 'anonymous',
      city: null,
      region: null,
      country: null,
      country_code: null,
      latitude: null,
      longitude: null,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns nulls for empty IP without making HTTP call', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as never);
    const result = await getLocationFromIP('');
    expect(result.city).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('Session DB operations - error handling', () => {
  function makeChain(resolved: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    const handler = () => c;
    ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single', 'neq', 'is', 'limit', 'gte', 'lte'].forEach(m => {
      c[m] = vi.fn(handler);
    });
    c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
    return c;
  }

  it('getUserSessions surfaces supabase errors', async () => {
    const c = makeChain({ data: null, error: { message: 'rls' } });
    const supa = {
      from: vi.fn(() => c),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never;
    const result = await getUserSessions('u1', supa);
    expect(result.success).toBe(false);
  });

  it('getUserSessions returns sessions array on success', async () => {
    const c = makeChain({ data: [{ id: 's1', user_id: 'u1' }], error: null });
    const supa = {
      from: vi.fn(() => c),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never;
    const result = await getUserSessions('u1', supa);
    expect(result.success).toBe(true);
    expect(result.sessions).toBeDefined();
  });

  it('revokeSession returns success: false on supabase error', async () => {
    const c = makeChain({ data: null, error: { message: 'cannot delete' } });
    const supa = { from: vi.fn(() => c) } as never;
    const result = await revokeSession('s1', supa);
    expect(result.success).toBe(false);
  });

  it('updateSessionActivity returns success on no-error path', async () => {
    const c = makeChain({ data: null, error: null });
    const supa = { from: vi.fn(() => c) } as never;
    const result = await updateSessionActivity('s1', supa);
    expect(result.success).toBe(true);
  });
});
