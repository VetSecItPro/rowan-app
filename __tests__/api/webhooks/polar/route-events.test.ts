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
  getPlanFromProductId: vi.fn(() => 'plus'),
  getPeriodFromProductId: vi.fn(() => 'monthly'),
  getPolarWebhookSecret: vi.fn(() => 'test-secret'),
}));
// Signature verification itself is covered in the base route.test.ts. Here we
// bypass StandardWebhooks validation and parse the body so the lifecycle-branch
// assertions can run against the event payload directly.
vi.mock('@polar-sh/sdk/webhooks', () => ({
  validateEvent: vi.fn((body: string) => JSON.parse(body)),
  WebhookVerificationError: class WebhookVerificationError extends Error {},
}));
vi.mock('@/lib/services/email-service', () => ({
  sendSubscriptionWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
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

  it('subscription.canceled KEEPS tier + access until period end and emails the user (Phase 11.4)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { sendSubscriptionCancelledEmail } = await import('@/lib/services/email-service');

    const fromMock = vi.mocked(supabaseAdmin.from);
    const lookupChain = chainFor({
      data: { user_id: 'u1', tier: 'plus', subscription_ends_at: '2025-02-01T00:00:00Z' },
      error: null,
    });
    const updateChain = chainFor({ data: null, error: null });
    const userChain = chainFor({ data: { email: 'u@x.com', full_name: 'User One' }, error: null });
    fromMock
      .mockReturnValueOnce(lookupChain as never)
      .mockReturnValueOnce(updateChain as never)
      .mockReturnValueOnce(userChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.canceled',
      data: { customerId: 'cus_1', currentPeriodEnd: '2025-03-01T00:00:00Z' },
    }));

    expect(res.status).toBe(200);
    // The fix: cancel must NOT downgrade to free. It marks canceled, records the
    // paid-through date, and leaves the tier intact (getUserTier honors it).
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'canceled',
      subscription_ends_at: '2025-03-01T00:00:00Z',
    }));
    const updateArg = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.tier).toBeUndefined();
    await new Promise(r => setTimeout(r, 0));
    expect(sendSubscriptionCancelledEmail).toHaveBeenCalled();
  });

  it('subscription.canceled skips owner-tier user', async () => {
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
    expect(sendSubscriptionCancelledEmail).not.toHaveBeenCalled();
  });

  it('subscription.revoked downgrades to free (Phase 11.4)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const fromMock = vi.mocked(supabaseAdmin.from);
    const lookupChain = chainFor({ data: { user_id: 'u1', tier: 'plus' }, error: null });
    const updateChain = chainFor({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(lookupChain as never)
      .mockReturnValueOnce(updateChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.revoked',
      data: { customerId: 'cus_1' },
    }));
    expect(res.status).toBe(200);
    // Revoke is the real downgrade: free tier, canceled status, link severed.
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'free',
      status: 'canceled',
      polar_subscription_id: null,
    }));
  });

  it('subscription.updated past_due keeps access and sends the recovery email (Phase 11.3)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { sendPaymentFailedEmail } = await import('@/lib/services/email-service');
    const fromMock = vi.mocked(supabaseAdmin.from);
    // existing row (was active), then update, then user lookup for the email
    const existingChain = chainFor({ data: { user_id: 'u1', tier: 'plus', status: 'active' }, error: null });
    const updateChain = chainFor({ data: null, error: null });
    const userChain = chainFor({ data: { email: 'u@x.com', full_name: 'User One' }, error: null });
    fromMock
      .mockReturnValueOnce(existingChain as never)
      .mockReturnValueOnce(updateChain as never)
      .mockReturnValueOnce(userChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.updated',
      data: { customerId: 'cus_1', productId: 'prod_1', status: 'past_due' },
    }));

    expect(res.status).toBe(200);
    // Access is kept (status past_due, not free) and the dunning email fires once.
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'past_due' }));
    await new Promise(r => setTimeout(r, 0));
    expect(sendPaymentFailedEmail).toHaveBeenCalled();
  });

  it('subscription.updated does NOT re-send the dunning email when already past_due (Phase 11.3 transition guard)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { sendPaymentFailedEmail } = await import('@/lib/services/email-service');
    const fromMock = vi.mocked(supabaseAdmin.from);
    // Existing row is ALREADY past_due (Polar's 2nd/3rd retry webhook). The
    // recovery email must fire only on the active->past_due TRANSITION, not on
    // every subsequent retry, or the user gets spammed during the dunning window.
    const existingChain = chainFor({ data: { user_id: 'u1', tier: 'plus', status: 'past_due' }, error: null });
    const updateChain = chainFor({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(existingChain as never)
      .mockReturnValueOnce(updateChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.updated',
      data: { customerId: 'cus_1', productId: 'prod_1', status: 'past_due' },
    }));

    expect(res.status).toBe(200);
    // Access still kept (status stays past_due) ...
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'past_due' }));
    // ... but NO second dunning email.
    await new Promise(r => setTimeout(r, 0));
    expect(sendPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it('subscription.updated does NOT downgrade a paying customer on an unresolved productId (review fix)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { getPlanFromProductId } = await import('@/lib/polar');
    // Missing/unrecognized product -> getPlanFromProductId returns 'free'.
    vi.mocked(getPlanFromProductId).mockReturnValueOnce('free');

    const fromMock = vi.mocked(supabaseAdmin.from);
    const existingChain = chainFor({ data: { user_id: 'u1', tier: 'plus', status: 'active' }, error: null });
    const updateChain = chainFor({ data: null, error: null });
    fromMock.mockReturnValueOnce(existingChain as never).mockReturnValueOnce(updateChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'subscription.updated',
      data: { customerId: 'cus_1' }, // no productId, no period fields
    }));

    expect(res.status).toBe(200);
    const arg = (updateChain.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    // Existing paid tier must be PRESERVED, never silently set to free.
    expect(arg.tier).toBe('plus');
    // Period fields absent from the event must NOT be written (would null the
    // paid-through date the cancel-grace entitlement depends on).
    expect(arg.subscription_ends_at).toBeUndefined();
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

  it('order.refunded skips owner-tier user (sec-ship guard)', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const fromMock = vi.mocked(supabaseAdmin.from);
    // First call = the new owner-tier lookup; return owner so the guard trips.
    const lookupChain = chainFor({ data: { tier: 'owner' }, error: null });
    const updateChain = chainFor({ data: null, error: null });
    fromMock.mockReturnValueOnce(lookupChain as never).mockReturnValueOnce(updateChain as never);

    const { POST } = await import('@/app/api/webhooks/polar/route');
    const res = await POST(makeReq({
      type: 'order.refunded',
      data: { customerId: 'cus_owner', subscriptionId: 'sub_1', id: 'order_1' },
    }));

    expect(res.status).toBe(200);
    // An owner must NOT be downgraded to free by a refund.
    expect(updateChain.update).not.toHaveBeenCalled();
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
