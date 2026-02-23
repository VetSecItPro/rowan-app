/**
 * Unit tests for lib/hooks/useCanAccessAI.ts
 *
 * Tests AI access control:
 * - Feature flag integration
 * - Tier-based access
 * - Loading states
 * - Upgrade prompts
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanAccessAI } from '@/lib/hooks/useCanAccessAI';
import type { SubscriptionTier } from '@/lib/types';

// Mock feature gate hook
const mockUseFeatureGateSafe = vi.fn();

vi.mock('@/lib/hooks/useFeatureGate', () => ({
  useFeatureGateSafe: (feature: string) => mockUseFeatureGateSafe(feature),
}));

// Mock feature flags
vi.mock('@/lib/constants/feature-flags', () => ({
  FEATURE_FLAGS: {
    AI_COMPANION: true,
  },
}));

describe('useCanAccessAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state when gate is not available', () => {
    mockUseFeatureGateSafe.mockReturnValue(null);

    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current).toEqual({
      canAccess: false,
      tier: 'free',
      isLoading: true,
      promptUpgrade: expect.any(Function),
    });
  });

  it('should grant access to plus tier users', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: true,
      tier: 'plus' as SubscriptionTier,
      isLoading: false,
      promptUpgrade: mockPromptUpgrade,
    });

    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current.canAccess).toBe(true);
    expect(result.current.tier).toBe('plus');
    expect(result.current.isLoading).toBe(false);
  });

  it('should grant access to pro tier users', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: true,
      tier: 'pro' as SubscriptionTier,
      isLoading: false,
      promptUpgrade: mockPromptUpgrade,
    });

    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current.canAccess).toBe(true);
    expect(result.current.tier).toBe('pro');
  });

  it('should deny access to free tier users', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: false,
      tier: 'free' as SubscriptionTier,
      isLoading: false,
      promptUpgrade: mockPromptUpgrade,
    });

    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current.canAccess).toBe(false);
    expect(result.current.tier).toBe('free');
  });

  it('should provide promptUpgrade function', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: false,
      tier: 'free' as SubscriptionTier,
      isLoading: false,
      promptUpgrade: mockPromptUpgrade,
    });

    const { result } = renderHook(() => useCanAccessAI());

    result.current.promptUpgrade();

    expect(mockPromptUpgrade).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state from feature gate', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: false,
      tier: 'free' as SubscriptionTier,
      isLoading: true,
      promptUpgrade: mockPromptUpgrade,
    });

    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current.isLoading).toBe(true);
  });

  it('should respect AI feature flag', () => {
    const mockPromptUpgrade = vi.fn();
    mockUseFeatureGateSafe.mockReturnValue({
      hasAccess: true,
      tier: 'plus' as SubscriptionTier,
      isLoading: false,
      promptUpgrade: mockPromptUpgrade,
    });

    // Feature flag is true by default in mock
    const { result } = renderHook(() => useCanAccessAI());

    expect(result.current.canAccess).toBe(true);
  });

  it('should call useFeatureGateSafe with ai feature', () => {
    mockUseFeatureGateSafe.mockReturnValue(null);

    renderHook(() => useCanAccessAI());

    expect(mockUseFeatureGateSafe).toHaveBeenCalledWith('ai');
  });
});
