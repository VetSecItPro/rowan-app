/**
 * Unit tests for lib/hooks/useFeatureGate.ts
 *
 * Tests feature gating based on subscription tier:
 * - Access control
 * - Tier requirements
 * - Upgrade prompts
 * - Check and prompt flow
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import type { SubscriptionTier } from '@/lib/types';

// Mock subscription context
const mockUseSubscriptionSafe = vi.fn();

vi.mock('@/lib/contexts/subscription-context', () => ({
  useSubscriptionSafe: () => mockUseSubscriptionSafe(),
}));

describe('useFeatureGate', () => {
  const mockShowUpgradeModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny access when subscription context unavailable', () => {
    mockUseSubscriptionSafe.mockReturnValue(null);

    const { result } = renderHook(() => useFeatureGate('ai'));

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tier).toBe('free');
  });

  it('should grant access to pro tier for AI features', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: (feature: string) => feature === 'canUseAI',
      effectiveTier: 'pro' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('ai'));

    expect(result.current.hasAccess).toBe(true);
    expect(result.current.tier).toBe('pro');
    expect(result.current.requiredTier).toBe('pro');
    expect(result.current.featureName).toBe('AI Features');
  });

  it('should deny access to free tier for pro features', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => false,
      effectiveTier: 'free' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('mealPlanning'));

    expect(result.current.hasAccess).toBe(false);
    expect(result.current.tier).toBe('free');
    expect(result.current.requiredTier).toBe('pro');
  });

  it('should call showUpgradeModal on promptUpgrade', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => false,
      effectiveTier: 'free' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('goals'));

    act(() => {
      result.current.promptUpgrade();
    });

    expect(mockShowUpgradeModal).toHaveBeenCalledWith('goals');
  });

  it('should return false and prompt on checkAndPrompt when no access', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => false,
      effectiveTier: 'free' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('household'));

    let hasAccess: boolean = true;
    act(() => {
      hasAccess = result.current.checkAndPrompt();
    });

    expect(hasAccess).toBe(false);
    expect(mockShowUpgradeModal).toHaveBeenCalledWith('household');
  });

  it('should return true on checkAndPrompt when has access', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => true,
      effectiveTier: 'pro' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('calendar'));

    let hasAccess: boolean = false;
    act(() => {
      hasAccess = result.current.checkAndPrompt();
    });

    expect(hasAccess).toBe(true);
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
  });

  it('should grant access to free tier for reminders', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: (feature: string) => feature === 'canUseReminders',
      effectiveTier: 'free' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('reminders'));

    expect(result.current.hasAccess).toBe(true);
    expect(result.current.requiredTier).toBe('free');
  });

  it('should require family tier for integrations', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => false,
      effectiveTier: 'pro' as SubscriptionTier,
      isLoading: false,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('integrations'));

    expect(result.current.requiredTier).toBe('family');
    expect(result.current.featureName).toBe('External Integrations');
  });

  it('should reflect loading state from subscription', () => {
    mockUseSubscriptionSafe.mockReturnValue({
      canAccess: () => false,
      effectiveTier: 'free' as SubscriptionTier,
      isLoading: true,
      showUpgradeModal: mockShowUpgradeModal,
    });

    const { result } = renderHook(() => useFeatureGate('photos'));

    expect(result.current.isLoading).toBe(true);
  });
});
