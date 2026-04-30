/**
 * Shared mock factory for `@/lib/hooks/useAuthWithSpaces`.
 *
 * Component test files that render components which call `useAuthWithSpaces()`
 * must mock the hook (jsdom has no provider tree). Use:
 *
 *   vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
 *     useAuthWithSpaces: vi.fn(() => mockAuthWithSpacesValue()),
 *   }));
 *
 * Pass overrides to customize per-test (e.g. `mockAuthWithSpacesValue({ user: null })`).
 */
import { vi } from 'vitest';

export function mockAuthWithSpacesValue(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    profile: null,
    spaces: [{ id: 'space-1', name: 'Test Space' }],
    currentSpace: { id: 'space-1', name: 'Test Space' },
    hasZeroSpaces: false,
    authLoading: false,
    profileLoading: false,
    spacesLoading: false,
    loading: false,
    isReady: true,
    authError: null,
    spacesError: null,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    switchSpace: vi.fn(),
    refreshSpaces: vi.fn(),
    createSpace: vi.fn(),
    deleteSpace: vi.fn(),
    ...overrides,
  };
}
