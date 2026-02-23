/**
 * Unit tests for hooks/useAuth.ts
 *
 * useAuth is a re-export from the auth context.
 * Tests that the re-export works and returns the expected shape.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

const mockUseAuthImpl = vi.fn().mockReturnValue({
  user: null,
  loading: false,
  isAuthenticated: false,
});

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuthImpl(),
}));

describe('useAuth re-export', () => {
  it('should be a function', () => {
    expect(typeof useAuth).toBe('function');
  });

  it('should return auth context values', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({
      user: null,
      loading: false,
      isAuthenticated: false,
    });
  });

  it('should reflect authenticated state when user is present', () => {
    mockUseAuthImpl.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('user-1');
  });
});
