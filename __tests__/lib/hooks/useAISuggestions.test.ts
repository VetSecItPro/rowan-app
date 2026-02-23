/**
 * Unit tests for lib/hooks/useAISuggestions.ts
 *
 * Tests AI-powered suggestions:
 * - Suggestion fetching
 * - Context-aware recommendations
 * - Loading states
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock fetch
global.fetch = vi.fn();

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
});

// Import after mocks
import { useAISuggestions } from '@/lib/hooks/useAISuggestions';

describe('useAISuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        suggestions: [
          { id: 'sug-1', text: 'Suggestion 1', priority: 'high' },
          { id: 'sug-2', text: 'Suggestion 2', priority: 'medium' },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should fetch AI suggestions', async () => {
    const { result, unmount } = renderHook(() => useAISuggestions('space-123'));

    // Wait for suggestions to be fetched
    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('spaceId=space-123')
    );

    unmount();
  });

  it('should not query without spaceId', async () => {
    const { unmount } = renderHook(() => useAISuggestions(undefined));

    // Wait a bit to ensure no fetch happens
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(global.fetch).not.toHaveBeenCalled();

    unmount();
  });

  it('should allow dismissing suggestions', async () => {
    const { result, unmount } = renderHook(() => useAISuggestions('space-123'));

    // Wait for initial fetch
    await waitFor(
      () => {
        expect(result.current.suggestions.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // Dismiss one suggestion
    act(() => {
      result.current.dismiss('sug-1');
    });

    await waitFor(() => {
      expect(result.current.suggestions.length).toBe(1);
    });

    expect(result.current.suggestions[0].id).toBe('sug-2');

    unmount();
  });
});
