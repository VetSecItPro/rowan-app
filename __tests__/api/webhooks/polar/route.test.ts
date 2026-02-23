import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { POST } from '@/app/api/webhooks/polar/route';

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('@/lib/polar', () => ({ getPlanFromProductId: vi.fn(() => 'pro') }));
vi.mock('@/lib/services/email-service', () => ({
  sendSubscriptionWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function makeChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc'].forEach(m => { mock[m] = vi.fn(handler); });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const WEBHOOK_SECRET = 'test-webhook-secret';

beforeEach(() => {
  process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
  vi.clearAllMocks();
});

describe('/api/webhooks/polar', () => {
  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false, limit: 60, remaining: 0, reset: Date.now() + 60000,
      });

      const body = JSON.stringify({ type: 'test', data: {} });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST',
        body,
        headers: { 'x-polar-signature': sign(body, WEBHOOK_SECRET) },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('returns 500 when POLAR_WEBHOOK_SECRET is not configured', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });
      delete process.env.POLAR_WEBHOOK_SECRET;

      const body = JSON.stringify({ type: 'test', data: {} });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST', body,
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it('returns 400 when signature is missing', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const body = JSON.stringify({ type: 'test', data: {} });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST', body,
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/signature/i);
    });

    it('returns 400 when signature is invalid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const body = JSON.stringify({ type: 'test', data: {} });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST',
        body,
        headers: { 'x-polar-signature': 'bad-signature' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const body = 'not-json';
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST',
        body,
        headers: { 'x-polar-signature': sign(body, WEBHOOK_SECRET) },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when payload fails Zod validation', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const body = JSON.stringify({ notType: 'blah' });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST',
        body,
        headers: { 'x-polar-signature': sign(body, WEBHOOK_SECRET) },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 200 for an unhandled event type', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      const body = JSON.stringify({ type: 'some.unknown.event', data: {} });
      const req = new NextRequest('http://localhost/api/webhooks/polar', {
        method: 'POST',
        body,
        headers: { 'x-polar-signature': sign(body, WEBHOOK_SECRET) },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
    });
  });
});
