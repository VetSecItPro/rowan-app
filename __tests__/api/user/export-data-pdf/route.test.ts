import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/export-data-pdf/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/data-export-service', () => ({
  exportAllUserData: vi.fn(),
  getDataSubset: vi.fn(),
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

// Mock jsPDF and autoTable so the PDF generation path runs without a browser
vi.mock('jspdf', () => {
  return {
    jsPDF: class MockJsPDF {
      lastAutoTable = { finalY: 100 };
      setFontSize = vi.fn();
      text = vi.fn();
      setTextColor = vi.fn();
      addPage = vi.fn();
      getNumberOfPages = vi.fn(() => 1);
      setPage = vi.fn();
      output = vi.fn(() => new ArrayBuffer(8));
    },
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

describe('/api/user/export-data-pdf GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest('http://localhost/api/user/export-data-pdf');
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

    const request = new NextRequest('http://localhost/api/user/export-data-pdf');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 500 when export service fails', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportAllUserData } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'a@b.com' } }, error: null }) },
    } as never);
    vi.mocked(exportAllUserData).mockResolvedValue({ success: false, error: 'Export failed' });

    const request = new NextRequest('http://localhost/api/user/export-data-pdf');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Export failed');
  });

  it('should return PDF with correct headers on success', async () => {
    const { checkExpensiveOperationRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { exportAllUserData } = await import('@/lib/services/data-export-service');
    vi.mocked(checkExpensiveOperationRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123', email: 'a@b.com' } }, error: null }) },
    } as never);
    vi.mocked(exportAllUserData).mockResolvedValue({
      success: true,
      data: { expenses: [], tasks: [], goals: [], budgets: [], bills: [], projects: [], calendar_events: [], reminders: [], messages: [], shopping_lists: [], shopping_items: [], meals: [], recipes: [] },
    });

    const request = new NextRequest('http://localhost/api/user/export-data-pdf');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('rowan-data-export');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
