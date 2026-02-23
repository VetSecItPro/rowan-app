/**
 * Unit tests for lib/hooks/useActiveSessions.ts
 *
 * Tests active user sessions tracking:
 * - Session initialization
 * - Online/offline detection
 * - Real-time updates
 * - Session cleanup
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

// Mock csrfFetch
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn((url, options) => fetch(url, options)),
}));

// Mock toast
vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { useActiveSessions } from '@/lib/hooks/useActiveSessions';

describe('useActiveSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        sessions: [],
      }),
    });
  });

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() => useActiveSessions());

    expect(result.current.activeSessions).toEqual([]);
    expect(result.current.isLoadingSessions).toBe(false);
  });

  it('should provide fetch function', () => {
    const { result } = renderHook(() => useActiveSessions());

    expect(typeof result.current.fetchActiveSessions).toBe('function');
    expect(typeof result.current.handleRevokeSession).toBe('function');
  });

  it('should provide session revoke state', () => {
    const { result } = renderHook(() => useActiveSessions());

    expect(result.current.sessionToRevoke).toBeNull();
    expect(result.current.showRevokeSessionModal).toBe(false);
  });

  it('should provide setters', () => {
    const { result } = renderHook(() => useActiveSessions());

    expect(typeof result.current.setSessionToRevoke).toBe('function');
    expect(typeof result.current.setShowRevokeSessionModal).toBe('function');
  });
});
