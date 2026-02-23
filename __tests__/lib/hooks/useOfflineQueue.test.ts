/**
 * Unit tests for lib/hooks/useOfflineQueue.ts
 *
 * Tests offline action queue:
 * - Action queueing
 * - Online/offline detection
 * - Queue processing
 * - Failed action retry
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock MutationQueueManager
const mockEnqueue = vi.fn().mockReturnValue('action-123');
const mockDequeue = vi.fn();
const mockRetryFailed = vi.fn();
const mockClearFailed = vi.fn();
const mockClearQueue = vi.fn();
const mockProcessQueue = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue(() => {});
const mockGetState = vi.fn().mockReturnValue({
  queue: [],
  failedActions: [],
  isProcessing: false,
});

vi.mock('@/lib/queue/mutation-queue-manager', () => ({
  MutationQueueManager: {
    getInstance: vi.fn(() => ({
      enqueue: mockEnqueue,
      dequeue: mockDequeue,
      retryFailed: mockRetryFailed,
      clearFailed: mockClearFailed,
      clearQueue: mockClearQueue,
      processQueue: mockProcessQueue,
      subscribe: mockSubscribe,
      getState: mockGetState,
    })),
  },
}));

// Import after mocks
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      queue: [],
      failedActions: [],
      isProcessing: false,
    });
  });

  it('should initialize with empty queue', () => {
    const { result } = renderHook(() => useOfflineQueue());

    expect(result.current.queue).toEqual([]);
    expect(result.current.failedActions).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
  });

  it('should enqueue action', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      const id = result.current.enqueue('task_create', '/api/tasks', 'POST', { title: 'Test' });
      expect(id).toBe('action-123');
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      '/api/tasks',
      'POST',
      { 'Content-Type': 'application/json' },
      '{"title":"Test"}'
    );
  });

  it('should dequeue action', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.dequeue('action-123');
    });

    expect(mockDequeue).toHaveBeenCalledWith('action-123');
  });

  it('should retry failed action', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.retryFailed('action-456');
    });

    expect(mockRetryFailed).toHaveBeenCalledWith('action-456');
  });

  it('should clear failed actions', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.clearFailed();
    });

    expect(mockClearFailed).toHaveBeenCalled();
  });

  it('should clear entire queue', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.clearQueue();
    });

    expect(mockClearQueue).toHaveBeenCalled();
  });

  it('should process queue', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.processQueue();
    });

    expect(mockProcessQueue).toHaveBeenCalled();
  });

  it('should track online status', () => {
    const { result } = renderHook(() => useOfflineQueue());

    expect(result.current.isOnline).toBe(true);
  });

  it('should subscribe to manager updates', () => {
    renderHook(() => useOfflineQueue());

    expect(mockSubscribe).toHaveBeenCalled();
  });
});
