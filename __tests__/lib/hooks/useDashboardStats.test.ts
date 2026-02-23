/**
 * Unit tests for lib/hooks/useDashboardStats.ts
 *
 * Tests initial state, stats loading, and refreshStats function.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRpc.mockResolvedValue({
      data: {
        tasks_due_today: 3,
        tasks_overdue: 1,
        chores_pending: 2,
        meals_planned: 5,
        shopping_active_lists: 1,
        goals_active: 2,
        reminders_upcoming: 4,
        messages_unread: 0,
        members_online: 1,
      },
      error: null,
    });

    const channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };
    mockChannel.mockReturnValue(channelMock);
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useDashboardStats({ id: 'user-1' }, { id: 'space-1', name: 'Test Space' } as any, false));

    expect(result.current.loading).toBe(true);
    // stats starts as initialStats object (not null)
    expect(result.current.stats).toBeDefined();
  });

  it('should load stats after mount', async () => {
    const { result } = renderHook(() => useDashboardStats({ id: 'user-1' }, { id: 'space-1', name: 'Test Space' } as any, false));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRpc).toHaveBeenCalledWith('get_dashboard_summary', expect.any(Object));
    expect(result.current.stats).not.toBeNull();
  });

  it('should expose a refreshStats function', () => {
    const { result } = renderHook(() => useDashboardStats({ id: 'user-1' }, { id: 'space-1', name: 'Test Space' } as any, false));

    expect(typeof result.current.refreshStats).toBe('function');
  });

  it('should handle RPC error gracefully', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

    const { result } = renderHook(() => useDashboardStats({ id: 'user-1' }, { id: 'space-1', name: 'Test Space' } as any, false));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Stats reset to initialStats (not null)
    expect(result.current.stats).toBeDefined();
  });

  it('should not load when spaceId is empty', async () => {
    const { result } = renderHook(() => useDashboardStats({ id: 'user-1' }, null, false));

    // Allow effects to settle
    await waitFor(() => {
      expect(mockRpc).not.toHaveBeenCalled();
    });

    expect(result.current.stats).toBeDefined();
  });
});
