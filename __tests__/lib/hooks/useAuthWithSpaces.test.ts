/**
 * Unit tests for lib/hooks/useAuthWithSpaces.tsx
 *
 * Tests unified auth+spaces hook:
 * - Combined state management
 * - Loading states
 * - Error propagation
 * - Ready state calculation
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import React from 'react';

// Mock contexts
const mockUseAuth = vi.fn();
const mockUseSpaces = vi.fn();

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: () => mockUseSpaces(),
}));

describe('useAuthWithSpaces', () => {
  const mockAuthState = {
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'token' },
    loading: false,
    profileLoading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  };

  const mockSpacesState = {
    spaces: [{ id: 'space-1', name: 'Test Space' }],
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
    error: null,
    hasZeroSpaces: false,
    switchSpace: vi.fn(),
    refreshSpaces: vi.fn(),
    createSpace: vi.fn(),
    deleteSpace: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should combine auth and spaces state', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.user).toEqual(mockAuthState.user);
    expect(result.current.session).toEqual(mockAuthState.session);
    expect(result.current.spaces).toEqual(mockSpacesState.spaces);
    expect(result.current.currentSpace).toEqual(mockSpacesState.currentSpace);
  });

  it('should set isAuthenticated to true when user and session exist', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should set isAuthenticated to false when no user', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, user: null });
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should combine loading states correctly', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, loading: true });
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.loading).toBe(true);
    expect(result.current.authLoading).toBe(true);
    expect(result.current.spacesLoading).toBe(false);
  });

  it('should show loading when authenticated but spaces loading', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, loading: true });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.loading).toBe(true);
  });

  it('should not show loading for spaces when not authenticated', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, user: null, loading: false });
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, loading: true });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.loading).toBe(false);
  });

  it('should combine error states with auth taking precedence', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, error: 'Auth error' });
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, error: 'Spaces error' });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.error).toBe('Auth error');
    expect(result.current.authError).toBe('Auth error');
    expect(result.current.spacesError).toBe('Spaces error');
  });

  it('should show spaces error when no auth error', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, error: 'Spaces error' });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.error).toBe('Spaces error');
  });

  it('should set isReady to true when auth complete and not authenticated', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, user: null, loading: false });
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isReady).toBe(true);
  });

  it('should set isReady to true when authenticated and spaces loaded', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isReady).toBe(true);
  });

  it('should set isReady to false while auth loading', () => {
    mockUseAuth.mockReturnValue({ ...mockAuthState, loading: true });
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isReady).toBe(false);
  });

  it('should set isReady to false when authenticated but spaces loading', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, loading: true });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.isReady).toBe(false);
  });

  it('should expose hasZeroSpaces from spaces context', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue({ ...mockSpacesState, hasZeroSpaces: true });

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.hasZeroSpaces).toBe(true);
  });

  it('should provide all auth methods', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.signUp).toBe(mockAuthState.signUp);
    expect(result.current.signIn).toBe(mockAuthState.signIn);
    expect(result.current.signOut).toBe(mockAuthState.signOut);
    expect(result.current.refreshProfile).toBe(mockAuthState.refreshProfile);
  });

  it('should provide all spaces methods', () => {
    mockUseAuth.mockReturnValue(mockAuthState);
    mockUseSpaces.mockReturnValue(mockSpacesState);

    const { result } = renderHook(() => useAuthWithSpaces());

    expect(result.current.switchSpace).toBe(mockSpacesState.switchSpace);
    expect(result.current.refreshSpaces).toBe(mockSpacesState.refreshSpaces);
    expect(result.current.createSpace).toBe(mockSpacesState.createSpace);
    expect(result.current.deleteSpace).toBe(mockSpacesState.deleteSpace);
  });
});
