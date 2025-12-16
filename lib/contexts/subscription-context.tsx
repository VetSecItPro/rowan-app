'use client';

/**
 * Subscription Context
 * Provides subscription and trial status throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { SubscriptionTier, TrialStatus, FeatureLimits } from '@/lib/types';
import { logger } from '@/lib/logger';

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
    maxSpaces: 1,
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
    maxSpaces: 1,
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
    maxSpaces: 3,
    storageGB: 15,
    prioritySupport: true,
  },
};

export interface SubscriptionContextValue {
  // Core subscription state
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier; // Considers trial (trial users = pro)
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

  // Computed values
  const isInTrial = trial.isInTrial;
  const trialDaysRemaining = trial.daysRemaining;
  const isTrialExpiringSoon = isInTrial && trialDaysRemaining <= 3;
  const hasTrialExpired = !isInTrial && trial.trialStartedAt !== null && trial.trialEndsAt !== null;

  // Effective tier considers trial status
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
