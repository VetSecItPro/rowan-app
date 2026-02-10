'use client';

/**
 * Subscription Context
 * Provides subscription and trial status throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { SubscriptionTier, TrialStatus, FeatureLimits } from '@/lib/types';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

// Feature limits by tier
const FEATURE_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    maxActiveTasks: 50,
    dailyTaskCreation: 5,
    canCreateCalendar: false,
    maxShoppingLists: 3,
    maxShoppingItems: 50,
    dailyShoppingUpdates: 10,
    messageHistoryDays: 30,
    dailyMessages: 20,
    dailyQuickActions: 10,
    canUploadPhotos: false,
    canUseMealPlanning: false,
    canUseReminders: true,
    canUseGoals: false,
    canUseHousehold: false,
    canUseLocation: false,
    canUseAI: false,
    canUseIntegrations: false,
    canUseEventProposals: false,
    realtimeSyncDelay: 5000,
    maxUsers: 2,
    maxSpaces: 1,  // Free tier: 1 space
  },
  pro: {
    maxActiveTasks: Infinity,
    dailyTaskCreation: Infinity,
    canCreateCalendar: true,
    maxShoppingLists: Infinity,
    maxShoppingItems: Infinity,
    dailyShoppingUpdates: Infinity,
    messageHistoryDays: Infinity,
    dailyMessages: Infinity,
    dailyQuickActions: Infinity,
    canUploadPhotos: true,
    canUseMealPlanning: true,
    canUseReminders: true,
    canUseGoals: true,
    canUseHousehold: true,
    canUseLocation: true,
    canUseAI: false,
    canUseIntegrations: false,
    canUseEventProposals: true,
    realtimeSyncDelay: 0,
    maxUsers: 2,
    maxSpaces: 2,  // Pro tier: 2 spaces
    storageGB: 5,
  },
  family: {
    maxActiveTasks: Infinity,
    dailyTaskCreation: Infinity,
    canCreateCalendar: true,
    maxShoppingLists: Infinity,
    maxShoppingItems: Infinity,
    dailyShoppingUpdates: Infinity,
    messageHistoryDays: Infinity,
    dailyMessages: Infinity,
    dailyQuickActions: Infinity,
    canUploadPhotos: true,
    canUseMealPlanning: true,
    canUseReminders: true,
    canUseGoals: true,
    canUseHousehold: true,
    canUseLocation: true,
    canUseAI: true,
    canUseIntegrations: true,
    canUseEventProposals: true,
    realtimeSyncDelay: 0,
    maxUsers: 6,
    maxSpaces: 3,  // Family tier: 3 spaces
    storageGB: 15,
    prioritySupport: true,
  },
};

export interface SubscriptionContextValue {
  // Core subscription state
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier; // Considers trial (pro)
  isLoading: boolean;

  // Trial state
  trial: TrialStatus;
  isInTrial: boolean;
  trialDaysRemaining: number;
  isTrialExpiringSoon: boolean; // < 3 days
  hasTrialExpired: boolean;

  // Feature access
  limits: FeatureLimits;
  canAccess: (feature: keyof FeatureLimits) => boolean;

  // Actions
  refresh: () => Promise<void>;
  showUpgradeModal: (feature?: string) => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [trial, setTrial] = useState<TrialStatus>({
    isInTrial: false,
    daysRemaining: 0,
    trialEndsAt: null,
    trialStartedAt: null,
  });
  const [, setUpgradeModalOpen] = useState(false);
  const [, setUpgradeFeature] = useState<string | undefined>();

  // Fetch subscription status with retry logic and performance monitoring
  const fetchSubscription = useCallback(async () => {
    const startTime = performance.now();
    const isTest = typeof process !== 'undefined' &&
                   (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true');

    // Retry configuration for production resilience
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 20000; // 20 second timeout per attempt

    try {
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

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Exponential backoff delay before retry (skip on first attempt)
          if (attempt > 0) {
            const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            logger.info(`Retrying subscription fetch after ${delayMs}ms delay`, {
              component: 'subscription-context',
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES,
            });
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          // Production-grade timeout - allows API to respond under heavy concurrent load
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            logger.warn('Subscription fetch timeout - aborting after 20s', {
              component: 'subscription-context',
              attempt: attempt + 1,
            });
            controller.abort();
          }, TIMEOUT_MS);

          let fetchSucceeded = false;

          try {
            logger.info('Fetching subscription from API', {
              component: 'subscription-context',
              url,
              attempt: attempt + 1,
            });

            const response = await fetch(url, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            fetchSucceeded = true;

            const fetchDuration = performance.now() - startTime;
            logger.info('Subscription API responded', {
              component: 'subscription-context',
              status: response.status,
              duration: `${fetchDuration.toFixed(0)}ms`,
              attempt: attempt + 1,
            });

            // Add breadcrumb for successful fetch
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

            if (!response.ok) {
              // Not logged in or error - default to free
              logger.warn('Subscription API returned non-ok status, defaulting to free', {
                component: 'subscription-context',
                status: response.status,
                attempt: attempt + 1,
              });
              if (isTest) {
                console.log(`[SUBSCRIPTION-CONTEXT] API error - status ${response.status}, defaulting to FREE`);
              }

              setTier('free');
              setTrial({
                isInTrial: false,
                daysRemaining: 0,
                trialEndsAt: null,
                trialStartedAt: null,
              });
              return;
            }

            const data = await response.json();
            logger.info('Subscription data received', {
              component: 'subscription-context',
              tier: data.tier,
              attempt: attempt + 1,
            });

            if (isTest) {
              console.log(`[SUBSCRIPTION-PROVIDER] Received from API:`, {
                topLevelTier: data.tier,
                subscriptionTier: data.subscription?.tier,
                subscriptionStatus: data.subscription?.status,
                willSetTier: data.tier || 'free',
              });
            }

            setTier(data.tier || 'free');

            if (data.trial) {
              setTrial({
                isInTrial: data.trial.isInTrial || false,
                daysRemaining: data.trial.daysRemaining || 0,
                trialEndsAt: data.trial.trialEndsAt ? new Date(data.trial.trialEndsAt) : null,
                trialStartedAt: data.trial.trialStartedAt ? new Date(data.trial.trialStartedAt) : null,
              });
            }

            // Success - track metrics in Sentry
            const totalDuration = performance.now() - startTime;

            if (!isTest) {
              Sentry.addBreadcrumb({
                category: 'subscription',
                message: 'Subscription fetch successful',
                level: 'info',
                data: {
                  total_duration_ms: totalDuration,
                  successful_attempt: attempt + 1,
                  tier: data.tier,
                },
              });

              // Set custom measurement for performance tracking
              Sentry.setMeasurement('subscription_fetch_duration', totalDuration, 'millisecond');
              Sentry.setContext('subscription_fetch', {
                duration_ms: totalDuration,
                attempts: attempt + 1,
                tier: data.tier,
                cache_hit: false,
              });
            }

            return; // Success - exit retry loop
          } catch (fetchError) {
            if (!fetchSucceeded) {
              clearTimeout(timeoutId);
            }

            lastError = fetchError as Error;

            if (lastError.name === 'AbortError') {
              logger.warn('Subscription fetch aborted (timeout)', {
                component: 'subscription-context',
                timeout: '20s',
                attempt: attempt + 1,
              });

              if (!isTest) {
                Sentry.addBreadcrumb({
                  category: 'subscription',
                  message: 'Subscription fetch timeout',
                  level: 'warning',
                  data: {
                    error: 'AbortError - timeout',
                    timeout_ms: TIMEOUT_MS,
                    attempt: attempt + 1,
                  },
                });
              }
            } else {
              logger.error('Subscription fetch error', {
                component: 'subscription-context',
                error: lastError.message,
                attempt: attempt + 1,
              });

              if (!isTest) {
                Sentry.addBreadcrumb({
                  category: 'subscription',
                  message: 'Subscription fetch error',
                  level: 'error',
                  data: {
                    error: lastError.message,
                    attempt: attempt + 1,
                  },
                });
              }
            }

            // If this is the last attempt, throw to outer catch
            if (attempt === MAX_RETRIES - 1) {
              throw lastError;
            }

            // Otherwise, continue to next retry
            continue;
          }
        } catch (attemptError) {
          throw attemptError;
        }
      }
    } catch (error) {
      const totalDuration = performance.now() - startTime;

      logger.error('Error fetching subscription after all retries:', error, {
        component: 'subscription-context',
        action: 'service_call',
        duration: `${totalDuration.toFixed(0)}ms`,
      });

      // Capture error in Sentry with context
      if (!isTest) {
        Sentry.setMeasurement('subscription_fetch_duration', totalDuration, 'millisecond');
        Sentry.setContext('subscription_fetch', {
          duration_ms: totalDuration,
          attempts: MAX_RETRIES,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        Sentry.captureException(error, {
          tags: {
            component: 'subscription-context',
            operation: 'fetch-subscription',
          },
          contexts: {
            subscription_retry: {
              max_attempts: MAX_RETRIES,
              total_duration_ms: totalDuration,
              timeout_ms: TIMEOUT_MS,
            },
          },
        });
      }

      // Default to free on error
      setTier('free');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Computed values - Trial
  const isInTrial = trial.isInTrial;
  const trialDaysRemaining = trial.daysRemaining;
  const isTrialExpiringSoon = isInTrial && trialDaysRemaining <= 3;
  const hasTrialExpired = !isInTrial && trial.trialStartedAt !== null && trial.trialEndsAt !== null;

  // Effective tier considers trial (pro)
  const effectiveTier = useMemo(() => {
    if (isInTrial) return 'pro';
    return tier;
  }, [isInTrial, tier]);

  const limits = useMemo(() => FEATURE_LIMITS[effectiveTier], [effectiveTier]);

  const canAccess = useCallback((feature: keyof FeatureLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
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
    trial,
    isInTrial,
    trialDaysRemaining,
    isTrialExpiringSoon,
    hasTrialExpired,
    limits,
    canAccess,
    refresh: fetchSubscription,
    showUpgradeModal,
  }), [
    tier,
    effectiveTier,
    isLoading,
    trial,
    isInTrial,
    trialDaysRemaining,
    isTrialExpiringSoon,
    hasTrialExpired,
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
  const { canAccess, effectiveTier, isInTrial, showUpgradeModal } = useSubscription();

  return {
    hasAccess: canAccess(feature),
    tier: effectiveTier,
    isInTrial,
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
      isInTrial: false,
      requestUpgrade: () => {},
    };
  }

  return {
    hasAccess: context.canAccess(feature),
    tier: context.effectiveTier,
    isInTrial: context.isInTrial,
    requestUpgrade: () => context.showUpgradeModal(feature as string),
  };
}
