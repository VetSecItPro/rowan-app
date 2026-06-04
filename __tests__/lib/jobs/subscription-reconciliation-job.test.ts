/**
 * Tests for subscription-reconciliation-job.ts (Phase 13 billing safety net).
 *
 * Verifies the job repairs local/Polar drift for past_due subscriptions:
 * recovers (->active), revokes (->free), leaves genuine dunning untouched, and
 * fails safe (per-row error capture, skip when Polar unconfigured).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcilePastDueSubscriptions } from '@/lib/jobs/subscription-reconciliation-job';

vi.mock('@/lib/polar', () => ({ getPolarClient: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getPolarClient } from '@/lib/polar';

type Row = {
  user_id: string;
  tier: string;
  status: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  subscription_ends_at: string | null;
};

/**
 * Minimal supabase-admin stub: the SELECT chain
 * (.select().eq().not()) resolves to `selectResult`; the UPDATE chain
 * (.update().eq()) resolves to { error: null } and records its payload.
 */
function makeSupabase(selectResult: { data: Row[] | null; error: unknown }) {
  const updates: Array<Record<string, unknown>> = [];
  const updateChain = (payload: Record<string, unknown>) => {
    updates.push(payload);
    return { eq: vi.fn(() => Promise.resolve({ error: null })) };
  };
  const selectChain = {
    eq: vi.fn(function (this: unknown) { return selectChain; }),
    not: vi.fn(() => Promise.resolve(selectResult)),
  };
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => updateChain(payload)),
    })),
  };
   
  return { supabase: supabase as any, updates };
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    user_id: 'user-1',
    tier: 'plus',
    status: 'past_due',
    polar_subscription_id: 'sub_123',
    polar_customer_id: 'cus_1',
    subscription_ends_at: null,
    ...overrides,
  };
}

function polarWith(getImpl: (params: { id: string }) => Promise<{ id: string; status: string }>) {
  return {
    subscriptions: { get: vi.fn(getImpl) },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('reconcilePastDueSubscriptions', () => {
  it('skips (ran=false) when Polar is not configured', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(null as never);
    const { supabase } = makeSupabase({ data: [], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.ran).toBe(false);
    expect(result.scanned).toBe(0);
    // Never touched the DB.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('recovers past_due -> active when Polar reports active', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => ({ id, status: 'active' })) as never,
    );
    const { supabase, updates } = makeSupabase({ data: [row()], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.recovered).toBe(1);
    expect(result.revoked).toBe(0);
    expect(updates[0]).toMatchObject({ status: 'active' });
    expect(updates[0]).not.toHaveProperty('tier');
  });

  it('revokes past_due -> free when Polar reports canceled (missed revoke)', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => ({ id, status: 'canceled' })) as never,
    );
    const { supabase, updates } = makeSupabase({ data: [row()], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.revoked).toBe(1);
    expect(updates[0]).toMatchObject({
      tier: 'free',
      status: 'canceled',
      polar_subscription_id: null,
    });
  });

  it('treats unpaid as terminal (downgrade to free)', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => ({ id, status: 'unpaid' })) as never,
    );
    const { supabase } = makeSupabase({ data: [row()], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);
    expect(result.revoked).toBe(1);
  });

  it('leaves genuine ongoing dunning (still past_due) untouched + entitled', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => ({ id, status: 'past_due' })) as never,
    );
    const { supabase, updates } = makeSupabase({ data: [row()], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.unchanged).toBe(1);
    expect(result.recovered).toBe(0);
    expect(result.revoked).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('skips owner-tier rows without calling Polar', async () => {
    const polar = polarWith(async ({ id }) => ({ id, status: 'canceled' }));
    vi.mocked(getPolarClient).mockResolvedValue(polar as never);
    const { supabase, updates } = makeSupabase({ data: [row({ tier: 'owner' })], error: null });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.unchanged).toBe(1);
    expect(polar.subscriptions.get).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('captures per-row errors without aborting the whole run', async () => {
    let call = 0;
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => {
        call++;
        if (call === 1) throw new Error('Polar 500');
        return { id, status: 'active' };
      }) as never,
    );
    const { supabase } = makeSupabase({
      data: [row({ user_id: 'u1', polar_subscription_id: 'sub_a' }), row({ user_id: 'u2', polar_subscription_id: 'sub_b' })],
      error: null,
    });

    const result = await reconcilePastDueSubscriptions(supabase);

    expect(result.scanned).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('sub_a');
    // Second row still processed.
    expect(result.recovered).toBe(1);
  });

  it('throws when the initial query errors (caller surfaces it)', async () => {
    vi.mocked(getPolarClient).mockResolvedValue(
      polarWith(async ({ id }) => ({ id, status: 'active' })) as never,
    );
    const { supabase } = makeSupabase({ data: null, error: { message: 'db down' } });

    await expect(reconcilePastDueSubscriptions(supabase)).rejects.toThrow(/db down/);
  });
});
