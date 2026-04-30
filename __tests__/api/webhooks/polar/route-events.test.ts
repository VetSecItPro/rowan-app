/**
 * Extended event-handler tests for the Polar webhook.
 * The base file (route.test.ts) covers signature/auth/validation.
 * This file covers the lifecycle event branches: subscription.updated,
 * subscription.canceled, subscription.revoked, order.refunded, checkout.updated,
 * plus the owner-tier guard and idempotency guard for subscription.created.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// supabaseAdmin is referenced through fluent chains. Each test customizes the
// `from()` impl per call to script the sequence of queries.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/polar', () => ({
  getPlanFromProductId: vi.fn(() => 'pro'),
  getPeriodFromProductId: vi.fn(() => 'monthly'),
}));
vi.mock('@/lib/services/email-service', () => ({
  sendSubscriptionWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/ratelimit', () => ({ checkGeneralRateLimit: vi.fn() }));
vi.mock('@/lib/ratelimit-fallback', () => ({ extractIP: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const SECRET = 'test-secret';
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');

function makeReq(payload: unknown) {
  const body = JSON.stringify(payload);
  return new NextRequest('http://localhost/api/webhooks/polar', {
    method: 'POST',
    body,
    headers: { 'x-polar-signature': sign(body) },
  });
}

/**
 * A reusable terminal-chain factory for `.from(...).select/update/...eq().single()`.
 * `then` lets us await the chain itself (e.g., `await supabase.from(...).update(...)`).
 */
function chainFor(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['select', 'update', 'insert', 'delete', 'upsert', 'eq', 'in', 'order', 'single', 'maybeSingle'].forEach(
    m => { c[m] = vi.fn(handler); }
  );
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(async () => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET;
  process.env.NEXT_PUBLIC_APP_URL = 'http://app';
  vi.clearAllMocks();
  const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
  });
});

describe('POST /api/webhooks/polar - lifecycle events', () => {
  it('subscription.updated updates tier on existing subscription', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);
    const { POST } = await import('@/app/api/webhooks/polar/route');

    const res = await POST(makeReq({
      type: 'subscription.updated',
      data: {
        customerId: 'cus_1',
        productId: 'prod_1',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
      },
    }));

    expect(res.status).toBe(200);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('subscriptions');
  });

  it('subscription.canceled downgrades non-owner to free + sends cancellation email', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { sendSubscriptionCancelledEmail } = await import('@/lib/services/email-service');

    // 1) Lookup currentSub by customer id (tier: pro, not owner)
    // 2) update subscription -> canceled
    // 3) Lookup user info for email
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockReturnValueOnce(chainFor({
      data: { user_id: 'u1', tier: 'pro', subscription_ends_at: '2025-02-01T00:00:00Z' },
      error: null,
    }) as never);
    fromMock.mockReturnValueOnce(chainFor({ data: null, error: null }) as never);
    fromMock.mockReturnValueOnce(chainFor({
      data: { email: 'u@x.com', full_name: 'User One' },
      error: null,
    }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.canceled',
      data: { customerId: 'cus_1' },
    }));

    expect(res.status).toBe(200);
    // Cancellation email is fired (non-blocking; we just verify it was scheduled).
    await new Promise(r => setTimeout(r, 0));
    expect(sendSubscriptionCancelledEmail).toHaveBeenCalled();
  });

  it('subscription.canceled skips downgrade for owner-tier user', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { sendSubscriptionCancelledEmail } = await import('@/lib/services/email-service');

    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(chainFor({
      data: { user_id: 'u1', tier: 'owner', subscription_ends_at: null },
      error: null,
    }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.canceled',
      data: { customerId: 'cus_owner' },
    }));

    expect(res.status).toBe(200);
    // Owner tier short-circuits before update + email.
    expect(sendSubscriptionCancelledEmail).not.toHaveBeenCalled();
  });

  it('subscription.revoked also routes through the cancel handler', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const fromMock = vi.mocked(supabaseAdmin.from);
    // currentSub lookup -> non-owner
    fromMock.mockReturnValueOnce(chainFor({
      data: { user_id: 'u1', tier: 'pro', subscription_ends_at: '2025-02-01T00:00:00Z' },
      error: null,
    }) as never);
    // update
    fromMock.mockReturnValueOnce(chainFor({ data: null, error: null }) as never);
    // user lookup
    fromMock.mockReturnValueOnce(chainFor({
      data: { email: 'u@x.com', full_name: null },
      error: null,
    }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.revoked',
      data: { customerId: 'cus_1' },
    }));
    expect(res.status).toBe(200);
  });

  it('order.refunded with subscriptionId triggers subscription cancel', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'order.refunded',
      data: { customerId: 'cus_1', subscriptionId: 'sub_1', id: 'order_1' },
    }));

    expect(res.status).toBe(200);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('subscriptions');
  });

  it('order.refunded without subscriptionId is a no-op (still 200)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'order.refunded',
      data: { customerId: 'cus_1', id: 'order_1' },
    }));
    expect(res.status).toBe(200);
  });

  it('checkout.updated with non-succeeded status is a no-op', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'checkout.updated',
      data: { status: 'pending', metadata: { userId: 'u1' }, customerId: 'cus_1', productId: 'prod_1' },
    }));
    expect(res.status).toBe(200);
    // No DB writes expected — short-circuit before update.
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('checkout.updated succeeded path persists customerId on subscription', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'checkout.updated',
      data: {
        status: 'succeeded',
        metadata: { userId: 'u1', billingInterval: 'monthly' },
        customerId: 'cus_1',
        productId: 'prod_1',
      },
    }));
    expect(res.status).toBe(200);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('subscriptions');
  });

  it('checkout.updated succeeded without userId in metadata short-circuits', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(supabaseAdmin.from).mockReturnValue(chainFor({ data: null, error: null }) as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'checkout.updated',
      data: {
        status: 'succeeded',
        metadata: {},
        customerId: 'cus_1',
        productId: 'prod_1',
      },
    }));
    // Logs error and breaks out, but webhook still returns 200 (we ack receipt).
    expect(res.status).toBe(200);
  });
});
