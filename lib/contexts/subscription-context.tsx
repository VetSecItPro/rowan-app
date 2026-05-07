'use client';

/**
 * Subscription Context
 * Provides subscription and trial status throughout the app
 *
 * Concurrency notes (2026-05-07, fix for concurrent-auth E2E timeout):
 *   1. Module-level in-flight cache — if multiple SubscriptionProvider mounts
 *      (StrictMode double-mount, route prefetch + actual nav, etc.) all fire
 *      in the same tick, they share ONE network request. Avoids self-DDoS on
 *      our own /api/subscriptions endpoint and removes a class of duplicate-
 *      fetch races.
 *   2. Hard isLoading ceiling — under any pathological condition (hung fetch,
 *      misbehaving retry, server compile lag in dev), `isLoading` is
 *      guaranteed to flip to false within MAX_TOTAL_LOAD_MS. Consumers like
 *      SubscriptionSettings then render with tier='free' fallback rather than
 *      spinning forever. The previous code relied on the fetch's `finally`
 *      block, which only fires when fetch resolves; the ceiling is the
 *      independent timer that fires regardless.
 *   3. 429 short-circuit — on rate-limit, do NOT retry. Default to free
 *      immediately. Retrying makes the rate limit worse and was the suspected
 *      cause of retry-storms under E2E concurrent load.
 *   4. Don't retry on 4xx (client errors) — only retry on network errors,
 *      timeouts, and 5xx. 401/403/404/429 indicate the server gave a final
 *      answer; retrying won't help.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import type { SubscriptionTier } from '@/lib/types';
import type { FeatureLimits } from '@/lib/types';
import { FEATURE_LIMITS } from '@/lib/config/feature-limits';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Re-export for backwards compatibility (consumers may import from here)
export { FEATURE_LIMITS };

export interface SubscriptionContextValue {
  // Core subscription state
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier;
  isLoading: boolean;

  // Feature access
  limits: FeatureLimits;
  canAccess: (feature: keyof FeatureLimits) => boolean;

  // Actions
  refresh: () => Promise<void>;
  showUpgradeModal: (feature?: string) => void;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Tunables (module-level so unit tests can override via __setTunables)
// ---------------------------------------------------------------------------
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 20000; // 20s per attempt
const DEFAULT_BACKOFF_BASE_MS = 1000; // 1s, 2s, 4s pattern
// MAX_TOTAL_LOAD_MS is the hard ceiling — isLoading WILL flip to false by
// this time, even if the fetch stack misbehaves. Set well below the E2E
// 120s waitFor so tests always see the rendered UI (with tier=free fallback
// at worst).
const DEFAULT_MAX_TOTAL_LOAD_MS = 75000;

interface SubscriptionTunables {
  maxRetries: number;
  timeoutMs: number;
  maxTotalLoadMs: number;
  backoffBaseMs: number;
}

let tunables: SubscriptionTunables = {
  maxRetries: DEFAULT_MAX_RETRIES,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxTotalLoadMs: DEFAULT_MAX_TOTAL_LOAD_MS,
  backoffBaseMs: DEFAULT_BACKOFF_BASE_MS,
};

/**
 * Test-only hook for overriding retry/timeout tunables. Production code
 * should never call this. The retry/timeout constants would otherwise force
 * unit tests into multi-second waits.
 */
export function __setSubscriptionTunablesForTesting(overrides: Partial<SubscriptionTunables>) {
  tunables = { ...tunables, ...overrides };
}

export function __resetSubscriptionTunablesForTesting() {
  tunables = {
    maxRetries: DEFAULT_MAX_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxTotalLoadMs: DEFAULT_MAX_TOTAL_LOAD_MS,
    backoffBaseMs: DEFAULT_BACKOFF_BASE_MS,
  };
}

// ---------------------------------------------------------------------------
// Module-level in-flight dedup
// Shared across all SubscriptionProvider mounts in this module instance, so
// React StrictMode double-mounts and rapid remounts coalesce into one fetch.
// ---------------------------------------------------------------------------
interface FetchResult {
  tier: SubscriptionTier;
}

let inflightFetch: Promise<FetchResult> | null = null;

export function __resetSubscriptionInflightForTesting() {
  inflightFetch = null;
}

/**
 * Fetch subscription with retry + timeout + 429-short-circuit semantics.
 * Always resolves (never rejects); on terminal failure resolves with tier='free'.
 */
async function performFetch(url: string, isTest: boolean): Promise<FetchResult> {
  const startTime = performance.now();
  const { maxRetries, timeoutMs } = tunables;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Exponential backoff before retries (skip first attempt)
    if (attempt > 0) {
      const delayMs = Math.pow(2, attempt - 1) * tunables.backoffBaseMs; // 1s, 2s, 4s by default
      logger.info(`Retrying subscription fetch after ${delayMs}ms delay`, {
        component: 'subscription-context',
        attempt: attempt + 1,
        maxRetries,
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn(`Subscription fetch timeout - aborting after ${timeoutMs}ms`, {
        component: 'subscription-context',
        attempt: attempt + 1,
      });
      controller.abort();
    }, timeoutMs);

    try {
      logger.info('Fetching subscription from API', {
        component: 'subscription-context',
        url,
        attempt: attempt + 1,
      });

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      const fetchDuration = performance.now() - startTime;
      logger.info('Subscription API responded', {
        component: 'subscription-context',
        status: response.status,
        duration: `${fetchDuration.toFixed(0)}ms`,
        attempt: attempt + 1,
      });

      if (!isTest) {
        Sentry.addBreadcrumb({
          category: 'subscription',
          message: 'Subscription API responded',
          level: 'info',
          data: {
            status: response.status,
            duration_ms: fetchDuration,
            attempt: attempt + 1,
          },
        });
      }

      // 429: rate-limited. DO NOT retry — retrying makes the rate limit worse.
      // Default to free and exit immediately.
      if (response.status === 429) {
        logger.warn('Subscription API rate-limited (429), defaulting to free without retry', {
          component: 'subscription-context',
          attempt: attempt + 1,
        });
        return { tier: 'free' };
      }

      // Other 4xx: server gave a final answer (401 unauth, 403 forbidden,
      // 404 not found). Retrying won't help. Default to free.
      if (response.status >= 400 && response.status < 500) {
        logger.warn(`Subscription API returned ${response.status}, defaulting to free without retry`, {
          component: 'subscription-context',
          status: response.status,
          attempt: attempt + 1,
        });
        return { tier: 'free' };
      }

      // 5xx: retry-eligible
      if (!response.ok) {
        lastError = new Error(`Server error ${response.status}`);
        if (attempt === maxRetries - 1) {
          logger.warn('Subscription API server error after all retries, defaulting to free', {
            component: 'subscription-context',
            status: response.status,
          });
          return { tier: 'free' };
        }
        continue;
      }

      // Success
      const data = await response.json();
      const tier: SubscriptionTier = data.tier || 'free';

      const totalDuration = performance.now() - startTime;
      if (!isTest) {
        Sentry.addBreadcrumb({
          category: 'subscription',
          message: 'Subscription fetch successful',
          level: 'info',
          data: {
            total_duration_ms: totalDuration,
            successful_attempt: attempt + 1,
            tier,
          },
        });
        Sentry.setMeasurement('subscription_fetch_duration', totalDuration, 'millisecond');
      }

      return { tier };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      lastError = fetchError as Error;

      const isAbort = lastError.name === 'AbortError';
      logger.warn(isAbort ? 'Subscription fetch aborted (timeout)' : 'Subscription fetch error', {
        component: 'subscription-context',
        error: lastError.message,
        attempt: attempt + 1,
      });

      if (!isTest) {
        Sentry.addBreadcrumb({
          category: 'subscription',
          message: isAbort ? 'Subscription fetch timeout' : 'Subscription fetch error',
          level: 'warning',
          data: { error: lastError.message, attempt: attempt + 1 },
        });
      }

      // Last attempt — exit loop and fall through to terminal-failure return
      if (attempt === maxRetries - 1) {
        break;
      }
      // else: continue to next retry
    }
  }

  // All retries exhausted via network error path
  const totalDuration = performance.now() - startTime;
  logger.error('Error fetching subscription after all retries:', lastError, {
    component: 'subscription-context',
    action: 'service_call',
    duration: `${totalDuration.toFixed(0)}ms`,
  });

  if (!isTest && lastError) {
    Sentry.captureException(lastError, {
      tags: {
        component: 'subscription-context',
        operation: 'fetch-subscription',
      },
      contexts: {
        subscription_retry: {
          max_attempts: maxRetries,
          total_duration_ms: totalDuration,
          timeout_ms: timeoutMs,
        },
      },
    });
  }

  return { tier: 'free' };
}

/**
 * Public entry — deduplicates concurrent fetches via a module-level
 * in-flight promise. The first caller starts the fetch; concurrent callers
 * await the same promise. Cleared after the fetch settles so subsequent
 * refreshes start a new request.
 */
async function fetchSubscriptionDeduped(url: string, isTest: boolean): Promise<FetchResult> {
  if (inflightFetch) {
    return inflightFetch;
  }
  inflightFetch = performFetch(url, isTest).finally(() => {
    inflightFetch = null;
  });
  return inflightFetch;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [, setUpgradeModalOpen] = useState(false);
  const [, setUpgradeFeature] = useState<string | undefined>();

  // Tracks whether the component is still mounted — prevents state updates
  // after unmount and prevents the hard-ceiling timer from racing the
  // resolve path.
  const isMountedRef = useRef(true);

  const fetchSubscription = useCallback(async () => {
    const isTest = typeof process !== 'undefined' &&
                   (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true');

    // DEV ONLY: Check for mockTier in URL for testing feature gating
    let url = '/api/subscriptions';
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const urlParams = new URLSearchParams(window.location.search);
      const mockTier = urlParams.get('mockTier');
      if (mockTier) {
        url = `/api/subscriptions?mockTier=${mockTier}`;
        logger.info(`[DEV] Testing with mock tier: ${mockTier}`, { component: 'subscription-context' });
      }
    }

    // Hard ceiling — guarantees isLoading flips to false within
    // maxTotalLoadMs even if something pathological happens. Without this,
    // a hung fetch (or hung retry stack) leaves consumers spinning forever.
    let ceilingFired = false;
    const ceilingTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      ceilingFired = true;
      logger.error('Subscription fetch hard-ceiling timeout — defaulting to free', {
        component: 'subscription-context',
        ceilingMs: tunables.maxTotalLoadMs,
      });
      setTier('free');
      setIsLoading(false);
    }, tunables.maxTotalLoadMs);

    try {
      const { tier: resolvedTier } = await fetchSubscriptionDeduped(url, isTest);
      if (!isMountedRef.current || ceilingFired) return;
      setTier(resolvedTier);
    } catch (error) {
      // performFetch never rejects, but be defensive against future changes.
      logger.error('Unexpected subscription fetch rejection:', error, {
        component: 'subscription-context',
      });
      if (!isMountedRef.current || ceilingFired) return;
      setTier('free');
    } finally {
      clearTimeout(ceilingTimer);
      if (isMountedRef.current && !ceilingFired) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSubscription();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSubscription]);

  // Effective tier is the actual subscription tier
  const effectiveTier = tier;

  const limits = useMemo(() => FEATURE_LIMITS[effectiveTier], [effectiveTier]);

  const canAccess = useCallback((feature: keyof FeatureLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    // -1 = unlimited (has access), 0 = no access, >0 = limited access
    if (typeof value === 'number') return value !== 0;
    return true;
  }, [limits]);

  const showUpgradeModal = useCallback((feature?: string) => {
    setUpgradeFeature(feature);
    setUpgradeModalOpen(true);
  }, []);

  const value = useMemo<SubscriptionContextValue>(() => ({
    tier,
    effectiveTier,
    isLoading,
    limits,
    canAccess,
    refresh: fetchSubscription,
    showUpgradeModal,
  }), [
    tier,
    effectiveTier,
    isLoading,
    limits,
    canAccess,
    fetchSubscription,
    showUpgradeModal,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Safe version of useSubscription that returns null if outside provider
 * Use this for components that may render before auth is ready
 */
export function useSubscriptionSafe(): SubscriptionContextValue | null {
  return useContext(SubscriptionContext) ?? null;
}

// Convenience hook for checking feature access
export function useFeatureAccess(feature: keyof FeatureLimits) {
  const { canAccess, effectiveTier, showUpgradeModal } = useSubscription();

  return {
    hasAccess: canAccess(feature),
    tier: effectiveTier,
    requestUpgrade: () => showUpgradeModal(feature as string),
  };
}

/**
 * Safe version of useFeatureAccess that returns defaults if outside provider
 * Use this for components that may render before auth/subscription is ready
 */
export function useFeatureAccessSafe(feature: keyof FeatureLimits) {
  const context = useSubscriptionSafe();

  if (!context) {
    return {
      hasAccess: false,
      tier: 'free' as const,
      requestUpgrade: () => {},
    };
  }

  return {
    hasAccess: context.canAccess(feature),
    tier: context.effectiveTier,
    requestUpgrade: () => context.showUpgradeModal(feature as string),
  };
}
