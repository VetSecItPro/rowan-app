import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prefetchCriticalData, prefetchFeatureData, PREFETCH_KEYS, getPrefetchForRoute } from '@/lib/services/prefetch-service';
import type { QueryClient } from '@tanstack/react-query';

// Mock Supabase client
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lt = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_OPTIONS: {
    features: { staleTime: 5 * 60 * 1000 },
    spaces: { staleTime: 10 * 60 * 1000 },
  },
}));

// Mock QueryClient - execute the queryFn when prefetchQuery is called
const mockPrefetchQuery = vi.fn();
const mockGetQueryData = vi.fn();
const mockGetQueryState = vi.fn();

const mockQueryClient: Partial<QueryClient> = {
  prefetchQuery: mockPrefetchQuery,
  getQueryData: mockGetQueryData,
  getQueryState: mockGetQueryState,
};

describe('prefetch-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.in.mockReturnValue(mockSupabase);
    mockSupabase.gte.mockReturnValue(mockSupabase);
    mockSupabase.lt.mockReturnValue(mockSupabase);
    mockSupabase.lte.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    // Make prefetchQuery actually execute the queryFn
    mockPrefetchQuery.mockImplementation(async (opts: { queryFn?: () => unknown }) => {
      if (opts.queryFn) {
        await opts.queryFn();
      }
    });
    mockGetQueryData.mockReturnValue(null);
    mockGetQueryState.mockReturnValue(null);
  });

  describe('PREFETCH_KEYS', () => {
    it('should generate correct cache keys for tasks', () => {
      const key = PREFETCH_KEYS.tasks('space-1');
      expect(key).toEqual(['tasks', 'list', 'space-1']);
    });

    it('should generate correct cache keys for calendar', () => {
      const key = PREFETCH_KEYS.calendar('space-1', '2024-01');
      expect(key).toEqual(['calendar', 'events', 'space-1', '2024-01']);
    });

    it('should generate correct cache keys for reminders', () => {
      const key = PREFETCH_KEYS.reminders('space-1');
      expect(key).toEqual(['reminders', 'list', 'space-1']);
    });
  });

  describe('prefetchCriticalData', () => {
    it('should skip prefetch when spaceId is empty', async () => {
      await prefetchCriticalData(mockQueryClient as QueryClient, '');
      expect(mockPrefetchQuery).not.toHaveBeenCalled();
    });

    it('should prefetch high priority data first', async () => {
      await prefetchCriticalData(mockQueryClient as QueryClient, 'space-1');

      // Should be called at least 3 times for high priority
      expect(mockPrefetchQuery).toHaveBeenCalled();
      expect(mockPrefetchQuery.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should prefetch tasks data', async () => {
      await prefetchCriticalData(mockQueryClient as QueryClient, 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should prefetch calendar events', async () => {
      await prefetchCriticalData(mockQueryClient as QueryClient, 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
    });

    it('should prefetch space members', async () => {
      await prefetchCriticalData(mockQueryClient as QueryClient, 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('space_members');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: new Error('DB error') });
      // Should not throw
      await expect(prefetchCriticalData(mockQueryClient as QueryClient, 'space-1')).resolves.not.toThrow();
    });
  });

  describe('prefetchFeatureData', () => {
    it('should skip prefetch when spaceId is empty', async () => {
      await prefetchFeatureData(mockQueryClient as QueryClient, 'tasks', '');
      expect(mockPrefetchQuery).not.toHaveBeenCalled();
    });

    it('should skip prefetch when data is already fresh', async () => {
      mockGetQueryData.mockReturnValue([{ id: '1' }]);
      mockGetQueryState.mockReturnValue({
        dataUpdatedAt: Date.now() - 1000, // 1 second ago
      });

      await prefetchFeatureData(mockQueryClient as QueryClient, 'tasks', 'space-1');
      expect(mockPrefetchQuery).not.toHaveBeenCalled();
    });

    it('should prefetch when data is stale', async () => {
      mockGetQueryData.mockReturnValue([{ id: '1' }]);
      mockGetQueryState.mockReturnValue({
        dataUpdatedAt: Date.now() - (10 * 60 * 1000), // 10 minutes ago
      });

      await prefetchFeatureData(mockQueryClient as QueryClient, 'tasks', 'space-1');
      expect(mockPrefetchQuery).toHaveBeenCalled();
    });

    it('should prefetch tasks feature', async () => {
      await prefetchFeatureData(mockQueryClient as QueryClient, 'tasks', 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should prefetch reminders feature', async () => {
      await prefetchFeatureData(mockQueryClient as QueryClient, 'reminders', 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('reminders');
    });

    it('should prefetch shopping lists feature', async () => {
      await prefetchFeatureData(mockQueryClient as QueryClient, 'shopping', 'space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('shopping_lists');
    });

    it('should handle calendar month option', async () => {
      // For calendar, order is the terminal (no limit)
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      await prefetchFeatureData(mockQueryClient as QueryClient, 'calendar', 'space-1', { month: '2024-02' });
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
    });
  });

  describe('getPrefetchForRoute', () => {
    it('should return correct feature for tasks route', () => {
      const feature = getPrefetchForRoute('/tasks');
      expect(feature).toBe('tasks');
    });

    it('should return correct feature for calendar route', () => {
      const feature = getPrefetchForRoute('/calendar');
      expect(feature).toBe('calendar');
    });

    it('should return correct feature for reminders route', () => {
      const feature = getPrefetchForRoute('/reminders');
      expect(feature).toBe('reminders');
    });

    it('should return correct feature for shopping route', () => {
      const feature = getPrefetchForRoute('/shopping');
      expect(feature).toBe('shopping');
    });

    it('should return null for unknown route', () => {
      const feature = getPrefetchForRoute('/unknown');
      expect(feature).toBeNull();
    });

    it('should return null for empty route', () => {
      const feature = getPrefetchForRoute('');
      expect(feature).toBeNull();
    });
  });
});
