/**
 * Unit tests for lib/hooks/useAIBriefing.ts
 *
 * Tests AI briefing generation:
 * - Briefing fetching
 * - Data aggregation
 * - Loading states
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Import after mocks
import { useAIBriefing } from '@/lib/hooks/useAIBriefing';

describe('useAIBriefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        briefing: {
          summary: 'Daily briefing content',
          tasks: [],
          events: [],
        },
      }),
    });
  });

  afterEach(() => {
    sessionStorageMock.clear();
  });

  it('should not query without spaceId', () => {
    const { result } = renderHook(() => useAIBriefing(undefined));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.briefing).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch AI briefing when in morning window', async () => {
    // Mock morning time (8am)
    const realDate = Date;
    global.Date = class extends realDate {
      constructor() {
        super();
        return new realDate('2024-01-01T08:00:00');
      }
      static now() {
        return new realDate('2024-01-01T08:00:00').getTime();
      }
    } as typeof Date;

    const { result } = renderHook(() => useAIBriefing('space-123'));

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.briefing).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith('/api/ai/briefing?spaceId=space-123');

    global.Date = realDate;
  });

  it('should handle fetch errors silently', async () => {
    const realDate = Date;
    global.Date = class extends realDate {
      constructor() {
        super();
        return new realDate('2024-01-01T08:00:00');
      }
      static now() {
        return new realDate('2024-01-01T08:00:00').getTime();
      }
    } as typeof Date;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to generate briefing' }),
    });

    const { result } = renderHook(() => useAIBriefing('space-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Should fail silently
    expect(result.current.briefing).toBeNull();

    global.Date = realDate;
  });

  it('should dismiss briefing', async () => {
    const realDate = Date;
    global.Date = class extends realDate {
      constructor() {
        super();
        return new realDate('2024-01-01T08:00:00');
      }
      static now() {
        return new realDate('2024-01-01T08:00:00').getTime();
      }
    } as typeof Date;

    const { result } = renderHook(() => useAIBriefing('space-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.briefing).toBeDefined();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.briefing).toBeNull();
    expect(sessionStorageMock.getItem('rowan_briefing_dismissed')).toBe('"2024-01-01"');

    global.Date = realDate;
  });
});
