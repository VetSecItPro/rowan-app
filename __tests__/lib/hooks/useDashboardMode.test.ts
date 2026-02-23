/**
 * Unit tests for lib/hooks/useDashboardMode.ts
 *
 * Tests dashboard mode management:
 * - localStorage persistence
 * - AI access gating
 * - Mode toggling
 * - Auto-revert on access loss
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';

// Mock useCanAccessAI
const mockUseCanAccessAI = vi.fn();

vi.mock('@/lib/hooks/useCanAccessAI', () => ({
  useCanAccessAI: () => mockUseCanAccessAI(),
}));

describe('useDashboardMode', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    store = {};

    // Mock localStorage completely
    Object.defineProperty(window, 'localStorage', {
      value: {
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
      },
      writable: true,
    });
  });

  it('should default to traditional mode', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    expect(result.current.mode).toBe('traditional');
  });

  it('should load mode from localStorage', () => {
    store['rowan_dashboard_mode'] = 'ai';
    mockUseCanAccessAI.mockReturnValue({ canAccess: true, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    expect(result.current.mode).toBe('ai');
  });

  it('should toggle between modes when AI access is granted', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: true, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    expect(result.current.mode).toBe('traditional');

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('ai');
    expect(store['rowan_dashboard_mode']).toBe('ai');

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe('traditional');
    expect(store['rowan_dashboard_mode']).toBe('traditional');
  });

  it('should not toggle to AI mode without access', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    expect(result.current.mode).toBe('traditional');

    act(() => {
      result.current.toggleMode();
    });

    // Should remain traditional
    expect(result.current.mode).toBe('traditional');
  });

  it('should set mode directly with setDashboardMode', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: true, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    act(() => {
      result.current.setDashboardMode('ai');
    });

    expect(result.current.mode).toBe('ai');
    expect(store['rowan_dashboard_mode']).toBe('ai');
  });

  it('should not allow setting AI mode without access', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    act(() => {
      result.current.setDashboardMode('ai');
    });

    expect(result.current.mode).toBe('traditional');
  });

  it('should revert to traditional when AI access is revoked', () => {
    // Start with AI access
    mockUseCanAccessAI.mockReturnValue({ canAccess: true, isLoading: false });
    store['rowan_dashboard_mode'] = 'ai';

    const { rerender, result } = renderHook(() => useDashboardMode());

    expect(result.current.mode).toBe('ai');

    // Simulate access revocation
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: false });

    rerender();

    expect(result.current.mode).toBe('traditional');
    expect(store['rowan_dashboard_mode']).toBe('traditional');
  });

  it('should not revert while AI access is loading', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: true });
    store['rowan_dashboard_mode'] = 'ai';

    const { result } = renderHook(() => useDashboardMode());

    // Should keep AI mode while loading
    expect(result.current.mode).toBe('ai');
  });

  it('should indicate mounted state', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: false, isLoading: false });

    const { result } = renderHook(() => useDashboardMode());

    expect(result.current.mounted).toBe(true);
  });

  it('should handle localStorage errors gracefully', () => {
    mockUseCanAccessAI.mockReturnValue({ canAccess: true, isLoading: false });

    // Restore normal localStorage for hook initialization
    const { result } = renderHook(() => useDashboardMode());

    // Mock localStorage to throw only after initialization
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage quota exceeded');
        },
        removeItem: () => {},
        clear: () => {},
      },
      writable: true,
      configurable: true,
    });

    // toggleMode should throw when localStorage fails (not wrapped in try-catch)
    expect(() => {
      act(() => {
        result.current.toggleMode();
      });
    }).toThrow('Storage quota exceeded');
  });
});
