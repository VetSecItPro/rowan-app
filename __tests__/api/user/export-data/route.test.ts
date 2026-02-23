import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/export-data/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/data-export-service', () => ({
  exportAllUserData: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkExpensiveOperationRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('/api/user/export-data GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/user/export-data');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should return 401 when not authenticated', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
    } as never);

    const request = new NextRequest('http://localhost/api/user/export-data');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return JSON export with proper headers on success', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportAllUserData } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(exportAllUserData).mockResolvedValue({
      success: true,
      data: { profile: { id: 'user-123', name: 'Test User' }, tasks: [] },
    });

    const request = new NextRequest('http://localhost/api/user/export-data');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('rowan-data-export');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('should return 500 when export service fails', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportAllUserData } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(exportAllUserData).mockResolvedValue({ success: false, error: 'Export failed' });

    const request = new NextRequest('http://localhost/api/user/export-data');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Export failed');
  });
});
