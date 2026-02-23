import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/export-data-csv/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/data-export-service', () => ({
  exportAllDataToCsv: vi.fn(),
  exportExpensesToCsv: vi.fn(),
  exportTasksToCsv: vi.fn(),
  exportEventsToCsv: vi.fn(),
  exportShoppingListsToCsv: vi.fn(),
  exportMessagesToCsv: vi.fn(),
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

describe('/api/user/export-data-csv GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/user/export-data-csv');
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

    const request = new NextRequest('http://localhost/api/user/export-data-csv');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return all CSV files when type=all', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportAllDataToCsv } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(exportAllDataToCsv).mockResolvedValue({
      expenses: 'date,amount\n2026-01-01,100',
      tasks: 'title,status\nBuy milk,done',
    });

    const request = new NextRequest('http://localhost/api/user/export-data-csv?type=all');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.files).toContain('expenses');
  });

  it('should return a CSV file attachment for type=expenses', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportExpensesToCsv } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(exportExpensesToCsv).mockResolvedValue('date,amount\n2026-01-01,100');

    const request = new NextRequest('http://localhost/api/user/export-data-csv?type=expenses');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('rowan-expenses');
  });

  it('should return tasks CSV for type=tasks', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportTasksToCsv } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);
    vi.mocked(exportTasksToCsv).mockResolvedValue('title,status\nTask1,open');

    const request = new NextRequest('http://localhost/api/user/export-data-csv?type=tasks');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('rowan-tasks');
  });
});
