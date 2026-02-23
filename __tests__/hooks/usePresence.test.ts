/**
 * Unit tests for hooks/usePresence.ts
 *
 * Tests presence data loading, online count calculation, and cleanup.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePresence } from '@/hooks/usePresence';

const mockGetSpaceMembersWithPresence = vi.fn();
const mockUpdateUserPresence = vi.fn();
const mockMarkUserOffline = vi.fn();

vi.mock('@/lib/services/presence-service', () => ({
  getSpaceMembersWithPresence: (...args: unknown[]) => mockGetSpaceMembersWithPresence(...args),
  updateUserPresence: (...args: unknown[]) => mockUpdateUserPresence(...args),
  markUserOffline: (...args: unknown[]) => mockMarkUserOffline(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/types', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    PresenceStatus: { ONLINE: 'online', OFFLINE: 'offline' },
  };
});

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetSpaceMembersWithPresence.mockResolvedValue({ success: true, data: [] });
    mockUpdateUserPresence.mockResolvedValue(undefined);
    mockMarkUserOffline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => usePresence('space-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.members).toEqual([]);
    expect(result.current.onlineCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should load members on mount', async () => {
    vi.useRealTimers();
    const members = [
      { id: 'user-1', name: 'Alice', presence_status: 'online' },
      { id: 'user-2', name: 'Bob', presence_status: 'offline' },
    ];
    mockGetSpaceMembersWithPresence.mockResolvedValue({ success: true, data: members });

    const { result } = renderHook(() => usePresence('space-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.members).toEqual(members);
  });

  it('should calculate onlineCount correctly', async () => {
    vi.useRealTimers();
    const members = [
      { id: 'user-1', presence_status: 'online' },
      { id: 'user-2', presence_status: 'online' },
      { id: 'user-3', presence_status: 'offline' },
    ];
    mockGetSpaceMembersWithPresence.mockResolvedValue({ success: true, data: members });

    const { result } = renderHook(() => usePresence('space-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.onlineCount).toBe(2);
  });

  it('should not fetch when spaceId is null', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePresence(null));

    // When spaceId is null, the effect returns early so isLoading stays true
    // and no fetch is made
    expect(result.current.isLoading).toBe(true);
    expect(mockGetSpaceMembersWithPresence).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });

  it('should expose refreshPresence function', () => {
    const { result } = renderHook(() => usePresence('space-1'));

    expect(typeof result.current.refreshPresence).toBe('function');
  });

  it('should set error when service fails', async () => {
    vi.useRealTimers();
    mockGetSpaceMembersWithPresence.mockResolvedValue({ success: false, error: 'Fetch failed' });

    const { result } = renderHook(() => usePresence('space-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Fetch failed');
  });

  it('should call markUserOffline on unmount', async () => {
    vi.useRealTimers();
    const { result, unmount } = renderHook(() => usePresence('space-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();

    await waitFor(() => expect(mockMarkUserOffline).toHaveBeenCalledWith('space-1'));
  });
});
