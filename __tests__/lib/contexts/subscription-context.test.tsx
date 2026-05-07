// @vitest-environment jsdom
/**
 * SubscriptionContext concurrency + error-handling tests
 *
 * Verifies the fix for the concurrent-auth E2E timeout (PR #...):
 *  - isLoading ALWAYS flips to false (no infinite-spin scenario)
 *  - Module-level dedup: N concurrent mounts → 1 fetch
 *  - 429 short-circuits without retry-storming
 *  - Hard ceiling fires even if fetch hangs forever
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import {
  SubscriptionProvider,
  useSubscription,
  __setSubscriptionTunablesForTesting,
  __resetSubscriptionTunablesForTesting,
  __resetSubscriptionInflightForTesting,
} from '@/lib/contexts/subscription-context';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  setMeasurement: vi.fn(),
  setContext: vi.fn(),
}));

// Surface state for assertions
function StateProbe({ onState }: { onState: (s: { tier: string; isLoading: boolean }) => void }) {
  const { tier, isLoading } = useSubscription();
  React.useEffect(() => {
    onState({ tier, isLoading });
  }, [tier, isLoading, onState]);
  return (
    <div>
      <span data-testid="tier">{tier}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
    </div>
  );
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('SubscriptionContext concurrency + error handling', () => {
  beforeEach(() => {
    __resetSubscriptionInflightForTesting();
    __resetSubscriptionTunablesForTesting();
    // Use small tunables so tests stay fast
    __setSubscriptionTunablesForTesting({
      maxRetries: 2,
      timeoutMs: 50,
      maxTotalLoadMs: 2000,
      backoffBaseMs: 5,
    });
    vi.stubGlobal('fetch', vi.fn());
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    __resetSubscriptionInflightForTesting();
    __resetSubscriptionTunablesForTesting();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('isLoading flips false after successful fetch', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ tier: 'pro' })
    );

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading && s.tier === 'pro')).toBe(true);
    });
  });

  it('isLoading flips false on 429 (no retry-storm)', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate-limited' }, { status: 429 }));

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading)).toBe(true);
    });

    // 429 must NOT trigger retries — exactly one fetch call
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Tier defaults to free
    const finalState = states[states.length - 1];
    expect(finalState.tier).toBe('free');
    expect(finalState.isLoading).toBe(false);
  });

  it('isLoading flips false on 401/403/404 (no retry on 4xx)', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, { status: 401 }));

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading)).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const finalState = states[states.length - 1];
    expect(finalState.tier).toBe('free');
  });

  it('retries on 5xx and eventually flips isLoading false', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'server' }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ tier: 'family' }));

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading && s.tier === 'family')).toBe(true);
    }, { timeout: 4000 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('isLoading flips false after all retries exhausted on network error', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValue(new Error('network down'));

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading)).toBe(true);
    }, { timeout: 4000 });

    // Defaults to free on terminal failure
    const finalState = states[states.length - 1];
    expect(finalState.tier).toBe('free');
    expect(finalState.isLoading).toBe(false);
    // Retried up to maxRetries
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hard-ceiling timer flips isLoading false even if fetch hangs forever', async () => {
    // Fetch returns a promise that never resolves
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => { /* never */ })
    );

    __setSubscriptionTunablesForTesting({
      maxRetries: 5,
      timeoutMs: 999999, // effectively no per-attempt timeout
      maxTotalLoadMs: 200, // ceiling fires fast
    });

    const states: Array<{ tier: string; isLoading: boolean }> = [];
    render(
      <SubscriptionProvider>
        <StateProbe onState={s => states.push(s)} />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(states.some(s => !s.isLoading)).toBe(true);
    }, { timeout: 2000 });

    const finalState = states[states.length - 1];
    expect(finalState.tier).toBe('free');
    expect(finalState.isLoading).toBe(false);
  });

  it('deduplicates concurrent mounts — N providers fire 1 fetch', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    let resolveResponse: (r: Response) => void = () => {};
    fetchMock.mockImplementation(
      () => new Promise<Response>(resolve => { resolveResponse = resolve; })
    );

    // Render 5 providers in the same tick
    render(
      <>
        <SubscriptionProvider><div /></SubscriptionProvider>
        <SubscriptionProvider><div /></SubscriptionProvider>
        <SubscriptionProvider><div /></SubscriptionProvider>
        <SubscriptionProvider><div /></SubscriptionProvider>
        <SubscriptionProvider><div /></SubscriptionProvider>
      </>
    );

    // Allow effects to fire
    await act(async () => { await Promise.resolve(); });

    // Despite 5 providers, only 1 in-flight fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveResponse(jsonResponse({ tier: 'pro' }));
      await Promise.resolve();
    });
  });

  it('after dedup completes, a fresh refresh starts a new fetch', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ tier: 'pro' }));

    const refreshHolder: { current: (() => Promise<void>) | null } = { current: null };
    function CaptureRefresh() {
      const { refresh } = useSubscription();
      // Stash on a ref-like object so the lint rule about reassigning
      // outer-scope variables in components doesn't trip.
      refreshHolder.current = refresh;
      return null;
    }

    render(
      <SubscriptionProvider>
        <CaptureRefresh />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ tier: 'family' }));

    await act(async () => {
      await refreshHolder.current?.();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
