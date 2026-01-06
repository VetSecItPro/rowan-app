'use client';

/**
 * Subscription Context
 * Provides subscription and trial status throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { SubscriptionTier, TrialStatus, FeatureLimits } from '@/lib/types';
import { logger } from '@/lib/logger';

// Beta tester status
export interface BetaStatus {
  isBetaTester: boolean;
  betaEndsAt: Date | null;
  daysRemaining: number;
  isExpired: boolean;
}

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
  effectiveTier: SubscriptionTier; // Considers beta testers (family) and trial (pro)
  isLoading: boolean;

  // Beta tester state
  beta: BetaStatus;
  isBetaTester: boolean;
  betaDaysRemaining: number;

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
  const [beta, setBeta] = useState<BetaStatus>({
    isBetaTester: false,
    betaEndsAt: null,
    daysRemaining: 0,
    isExpired: false,
  });
  const [trial, setTrial] = useState<TrialStatus>({
    isInTrial: false,
    daysRemaining: 0,
    trialEndsAt: null,
    trialStartedAt: null,
  });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
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

      const response = await fetch(url);
      if (!response.ok) {
        // Not logged in or error - default to free
        setTier('free');
        setBeta({
          isBetaTester: false,
          betaEndsAt: null,
          daysRemaining: 0,
          isExpired: false,
        });
        setTrial({
          isInTrial: false,
          daysRemaining: 0,
          trialEndsAt: null,
          trialStartedAt: null,
        });
        return;
      }

      const data = await response.json();
      setTier(data.tier || 'free');

      // Handle beta status
      if (data.beta) {
        setBeta({
          isBetaTester: data.beta.isBetaTester || false,
          betaEndsAt: data.beta.betaEndsAt ? new Date(data.beta.betaEndsAt) : null,
          daysRemaining: data.beta.daysRemaining || 0,
          isExpired: data.beta.isExpired || false,
        });
      }

      if (data.trial) {
        setTrial({
          isInTrial: data.trial.isInTrial || false,
          daysRemaining: data.trial.daysRemaining || 0,
          trialEndsAt: data.trial.trialEndsAt ? new Date(data.trial.trialEndsAt) : null,
          trialStartedAt: data.trial.trialStartedAt ? new Date(data.trial.trialStartedAt) : null,
        });
      }
    } catch (error) {
      logger.error('Error fetching subscription:', error, { component: 'subscription-context', action: 'service_call' });
      // Default to free on error
      setTier('free');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Computed values - Beta
  const isBetaTester = beta.isBetaTester;
  const betaDaysRemaining = beta.daysRemaining;

  // Computed values - Trial
  const isInTrial = trial.isInTrial;
  const trialDaysRemaining = trial.daysRemaining;
  const isTrialExpiringSoon = isInTrial && trialDaysRemaining <= 3;
  const hasTrialExpired = !isInTrial && trial.trialStartedAt !== null && trial.trialEndsAt !== null;

  // Effective tier considers beta testers (family) and trial (pro)
  const effectiveTier = useMemo(() => {
    if (isBetaTester) return 'family'; // Beta testers get full access
    if (isInTrial) return 'pro';
    return tier;
  }, [isBetaTester, isInTrial, tier]);

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
    beta,
    isBetaTester,
    betaDaysRemaining,
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
    beta,
    isBetaTester,
    betaDaysRemaining,
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
