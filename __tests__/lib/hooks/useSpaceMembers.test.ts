/**
 * Unit tests for lib/hooks/useSpaceMembers.ts
 *
 * Tests initial state, fetchSpaceMembers, and invitation management.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSpaceMembers } from '@/lib/hooks/useSpaceMembers';

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useSpaceMembers', () => {
  const mockRefreshSpaces = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: members endpoint returns two members
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: 'user-1', name: 'Alice', email: 'alice@example.com', role: 'Admin', isCurrentUser: true },
          { id: 'user-2', name: 'Bob', email: 'bob@example.com', role: 'Member', isCurrentUser: false },
        ],
      }),
    });
  });

  it('should return initial state with empty members and loading false', () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    expect(result.current.spaceMembers).toEqual([]);
    expect(result.current.isLoadingMembers).toBe(false);
    expect(result.current.pendingInvitations).toEqual([]);
  });

  it('should fetch members when fetchSpaceMembers is called', async () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    await act(async () => {
      await result.current.fetchSpaceMembers();
    });

    expect(result.current.spaceMembers).toHaveLength(2);
    expect(result.current.spaceMembers[0].name).toBe('Alice');
  });

  it('should expose fetchSpaceMembers function', () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    expect(typeof result.current.fetchSpaceMembers).toBe('function');
  });

  it('should expose handleRemoveMember function', () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    expect(typeof result.current.handleRemoveMember).toBe('function');
  });

  it('handleRemoveMember should set memberToRemove and show confirm', async () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    // First fetch members so handleRemoveMember can find them
    await act(async () => {
      await result.current.fetchSpaceMembers();
    });

    act(() => result.current.handleRemoveMember('user-2'));

    expect(result.current.memberToRemove).toBe('user-2');
    expect(result.current.showRemoveMemberConfirm).toBe(true);
  });

  it('should handle failed members fetch gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: 'Not authorized' }),
    });

    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    await act(async () => {
      await result.current.fetchSpaceMembers();
    });

    // Should not crash and members remain empty
    expect(result.current.spaceMembers).toEqual([]);
  });

  it('should expose rename space state', () => {
    const { result } = renderHook(() => useSpaceMembers('space-1', 'Test Space', mockRefreshSpaces));

    expect(result.current.isRenamingSpace).toBe(false);
    expect(typeof result.current.setIsRenamingSpace).toBe('function');
    expect(typeof result.current.setNewSpaceNameEdit).toBe('function');
  });
});
