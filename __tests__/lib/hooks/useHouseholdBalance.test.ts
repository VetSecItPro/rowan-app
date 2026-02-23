/**
 * Unit tests for lib/hooks/useHouseholdBalance.ts
 *
 * Tests household balance calculations:
 * - Task distribution
 * - Workload balancing
 * - Member contribution tracking
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock service - use factory function to avoid hoisting issues
vi.mock('@/lib/services/household-balance-service', () => ({
  householdBalanceService: {
    getBalance: vi.fn(),
  },
}));

// Mock fetch for members API
global.fetch = vi.fn() as any;

// Import after mocks
import { useHouseholdBalance } from '@/lib/hooks/useHouseholdBalance';
import { householdBalanceService } from '@/lib/services/household-balance-service';

describe('useHouseholdBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock responses
    (householdBalanceService.getBalance as ReturnType<typeof vi.fn>).mockResolvedValue({
      memberContributions: [],
      totalTasks: 0,
      balanceScore: 100,
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'user-1', name: 'User 1', avatar: null, color_theme: 'blue' },
        ],
      }),
    });
  });

  it('should not load when spaceId is undefined', () => {
    const { result } = renderHook(() => useHouseholdBalance(undefined, 'user-123'));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should load household balance data', async () => {
    const { result } = renderHook(() => useHouseholdBalance('space-123', 'user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(householdBalanceService.getBalance).toHaveBeenCalled();
  });

  it('should handle timeframe changes', async () => {
    const { result } = renderHook(() => useHouseholdBalance('space-123', 'user-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.timeframe).toBe('week');

    // Change timeframe
    await act(async () => {
      result.current.setTimeframe('month');
      await Promise.resolve(); // Let state update
    });

    expect(result.current.timeframe).toBe('month');
  });
});
