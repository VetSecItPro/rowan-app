import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE, GET } from '@/app/api/privacy/account-deletion/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkSensitiveOperationRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn(() => 'http://localhost:3000'),
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select','eq','order','insert','update','delete','single','limit','maybeSingle','gte','lte','in','neq','is','not','upsert','rpc','match','or','filter','range','ilike','like','contains','containedBy','textSearch'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

describe('/api/privacy/account-deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when rate limited', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 409 when active deletion request already exists', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);

      const existingReqChain = createChainMock({ data: { id: 'req-1' }, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => existingReqChain),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already have an active');
    });

    it('should create deletion request successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);

      const deletionRequest = { id: 'del-req-1', user_id: 'user-123', scheduled_deletion_date: new Date(Date.now() + 30 * 86400000).toISOString() };
      const noExistingChain = createChainMock({ data: null, error: null });
      const insertReqChain = createChainMock({ data: deletionRequest, error: null });
      const profileChain = createChainMock({ data: { email: null }, error: null });
      const logChain = createChainMock({ data: null, error: null });

      let callCount = 0;
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) return noExistingChain;
          if (callCount === 2) return insertReqChain;
          if (callCount === 3) return profileChain;
          return logChain;
        }),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Testing' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('30 days to cancel');
    });
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return hasActiveRequest false when no deletion request exists', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.hasActiveRequest).toBe(false);
      expect(data.data.scheduledDate).toBeNull();
    });

    it('should return deletion status with days remaining', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const futureDate = new Date(Date.now() + 15 * 86400000).toISOString();
      const deletionRecord = {
        id: 'del-1',
        user_id: 'user-123',
        scheduled_deletion_date: futureDate,
        deletion_completed: false,
        cancelled_at: null,
        reminder_sent_7_days: false,
        reminder_sent_1_day: false,
      };
      const chain = createChainMock({ data: deletionRecord, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.hasActiveRequest).toBe(true);
      expect(data.data.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 404 when no active deletion request found', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const { checkSensitiveOperationRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkSensitiveOperationRateLimit).mockResolvedValue({ success: true } as never);

      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/privacy/account-deletion', {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('No active deletion request');
    });
  });
});
