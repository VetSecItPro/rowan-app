import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/user/sessions/[sessionId]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/session-tracking-service', () => ({
  revokeSession: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
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

const VALID_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('/api/user/sessions/[sessionId] DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: false } as never);

    const request = new NextRequest(`http://localhost/api/user/sessions/${VALID_SESSION_ID}`, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: VALID_SESSION_ID }) });
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

    const request = new NextRequest(`http://localhost/api/user/sessions/${VALID_SESSION_ID}`, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: VALID_SESSION_ID }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid session ID format', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
    } as never);

    const request = new NextRequest('http://localhost/api/user/sessions/not-a-uuid', { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'not-a-uuid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid session ID format');
  });

  it('should return 404 when session not found', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const chain = createChainMock({ data: null, error: { message: 'Not found' } });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      from: vi.fn(() => chain),
    } as never);

    const request = new NextRequest(`http://localhost/api/user/sessions/${VALID_SESSION_ID}`, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: VALID_SESSION_ID }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should return 403 when session belongs to another user', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);

    const chain = createChainMock({ data: { user_id: 'other-user' }, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      from: vi.fn(() => chain),
    } as never);

    const request = new NextRequest(`http://localhost/api/user/sessions/${VALID_SESSION_ID}`, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: VALID_SESSION_ID }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('should revoke session successfully', async () => {
    const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
    const { createClient } = await import('@/lib/supabase/server');
    const { revokeSession } = await import('@/lib/services/session-tracking-service');
    vi.mocked(checkGeneralRateLimit).mockResolvedValue({ success: true } as never);
    vi.mocked(revokeSession).mockResolvedValue({ success: true });

    const chain = createChainMock({ data: { user_id: 'user-123' }, error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }) },
      from: vi.fn(() => chain),
    } as never);

    const request = new NextRequest(`http://localhost/api/user/sessions/${VALID_SESSION_ID}`, { method: 'DELETE' });
    const response = await DELETE(request, { params: Promise.resolve({ sessionId: VALID_SESSION_ID }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Session revoked successfully');
  });
});
