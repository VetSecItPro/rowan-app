import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/user/cancel-deletion/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/account-deletion-service', () => ({
  accountDeletionService: {
    isAccountMarkedForDeletion: vi.fn(),
    cancelAccountDeletion: vi.fn(),
  },
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf-validation', () => ({
  validateCsrfRequest: vi.fn(() => null),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

describe('/api/user/cancel-deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }) },
      } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when account is not marked for deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { accountDeletionService } = await import('@/lib/services/account-deletion-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(accountDeletionService.isAccountMarkedForDeletion).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Account is not marked for deletion');
    });

    it('should cancel deletion successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { accountDeletionService } = await import('@/lib/services/account-deletion-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(accountDeletionService.isAccountMarkedForDeletion).mockResolvedValue(true);
      vi.mocked(accountDeletionService.cancelAccountDeletion).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost/api/user/cancel-deletion', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Account deletion cancelled successfully');
    });

    it('should return 500 when cancellation service fails', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { accountDeletionService } = await import('@/lib/services/account-deletion-service');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      } as never);
      vi.mocked(accountDeletionService.isAccountMarkedForDeletion).mockResolvedValue(true);
      vi.mocked(accountDeletionService.cancelAccountDeletion).mockResolvedValue({ success: false, error: 'DB error' });

      const request = new NextRequest('http://localhost/api/user/cancel-deletion', { method: 'POST' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('DB error');
    });
  });

  describe('GET', () => {
    it('should return 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }) },
      } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return markedForDeletion false when no record exists', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.markedForDeletion).toBe(false);
    });

    it('should return deletion info when account is marked for deletion', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

      const deletionRecord = {
        deletion_requested_at: '2026-01-01T00:00:00.000Z',
        permanent_deletion_at: '2026-01-31T00:00:00.000Z',
      };
      const chain = createChainMock({ data: deletionRecord, error: null });
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
        from: vi.fn(() => chain),
      } as never);

      const request = new NextRequest('http://localhost/api/user/cancel-deletion');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.markedForDeletion).toBe(true);
      expect(data.deletionRequestedAt).toBe(deletionRecord.deletion_requested_at);
    });
  });
});
