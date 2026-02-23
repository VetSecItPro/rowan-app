/**
 * Unit tests for hooks/useNetworkStatus.ts
 *
 * Tests online/offline state, browser event handling, and refresh function.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const mockGetNetworkStatus = vi.fn();
const mockWatchNetworkStatus = vi.fn();
const mockGetTimeoutForQuality = vi.fn();
const mockShouldDeferRequest = vi.fn();

vi.mock('@/lib/native/network', () => ({
  getNetworkStatus: (...args: unknown[]) => mockGetNetworkStatus(...args),
  watchNetworkStatus: (...args: unknown[]) => mockWatchNetworkStatus(...args),
  getTimeoutForQuality: (...args: unknown[]) => mockGetTimeoutForQuality(...args),
  shouldDeferRequest: (...args: unknown[]) => mockShouldDeferRequest(...args),
}));

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNetworkStatus.mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
      quality: 'good',
    });
    mockWatchNetworkStatus.mockResolvedValue(() => {});
    mockGetTimeoutForQuality.mockReturnValue(10000);
    mockShouldDeferRequest.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial online state of true (default)', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Default initial state before async init
    expect(result.current.isOnline).toBe(true);
  });

  it('should return isOnline true after init when connected', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(mockGetNetworkStatus).toHaveBeenCalledTimes(1));

    expect(result.current.isOnline).toBe(true);
  });

  it('should return isOnline false when network status is disconnected', async () => {
    mockGetNetworkStatus.mockResolvedValue({
      connected: false,
      connectionType: 'none',
      quality: 'offline',
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.isOnline).toBe(false));
  });

  it('should expose a refresh function', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should respond to window offline event by setting isOnline to false', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(mockGetNetworkStatus).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('should respond to window online event by setting isOnline to true', async () => {
    mockGetNetworkStatus.mockResolvedValue({
      connected: false,
      connectionType: 'none',
      quality: 'offline',
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.isOnline).toBe(false));

    mockGetNetworkStatus.mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
      quality: 'good',
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should call watchNetworkStatus on mount', async () => {
    renderHook(() => useNetworkStatus());

    await waitFor(() => expect(mockWatchNetworkStatus).toHaveBeenCalledTimes(1));
  });
});
