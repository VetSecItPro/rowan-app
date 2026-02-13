'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useMemo } from 'react';

/**
 * UNIFIED AUTH WITH SPACES HOOK - PHASE 3 INTEGRATION
 *
 * Provides a unified interface combining AuthContext and SpacesContext
 * - Handles complex state interactions between auth and spaces
 * - Provides comprehensive loading and error states
 * - Manages zero-spaces scenarios properly
 */

export interface AuthWithSpacesState {
  // Combined authentication state
  user: ReturnType<typeof useAuth>['user'];
  session: ReturnType<typeof useAuth>['session'];
  isAuthenticated: boolean;

  // Combined spaces state
  spaces: ReturnType<typeof useSpaces>['spaces'];
  currentSpace: ReturnType<typeof useSpaces>['currentSpace'];
  hasZeroSpaces: ReturnType<typeof useSpaces>['hasZeroSpaces'];

  // Combined loading states
  authLoading: ReturnType<typeof useAuth>['loading'];
  profileLoading: ReturnType<typeof useAuth>['profileLoading'];
  spacesLoading: ReturnType<typeof useSpaces>['loading'];
  loading: boolean; // True if either auth or spaces is loading

  // Combined error states
  authError: ReturnType<typeof useAuth>['error'];
  spacesError: ReturnType<typeof useSpaces>['error'];
  error: string | null; // Primary error (auth takes precedence)

  // Authentication methods (from AuthContext)
  signUp: ReturnType<typeof useAuth>['signUp'];
  signIn: ReturnType<typeof useAuth>['signIn'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  refreshProfile: ReturnType<typeof useAuth>['refreshProfile'];

  // Spaces methods (from SpacesContext)
  switchSpace: ReturnType<typeof useSpaces>['switchSpace'];
  refreshSpaces: ReturnType<typeof useSpaces>['refreshSpaces'];
  createSpace: ReturnType<typeof useSpaces>['createSpace'];
  deleteSpace: ReturnType<typeof useSpaces>['deleteSpace'];

  // State helpers
  isReady: boolean; // True when auth is complete and spaces are loaded (or confirmed zero)
}

/**
 * Main integration hook - combines auth and spaces contexts
 */
export function useAuthWithSpaces(): AuthWithSpacesState {
  const auth = useAuth();
  const spaces = useSpaces();

  const state = useMemo(() => {
    const isAuthenticated = !!(auth.user && auth.session);

    const authLoading = auth.loading;
    const profileLoading = auth.profileLoading;
    const spacesLoading = spaces.loading;

    const authError = auth.error;
    const spacesError = spaces.error;
    const hasZeroSpaces = spaces.hasZeroSpaces;

    const loading = authLoading || (isAuthenticated && spacesLoading);
    const error = authError || spacesError;
    const isReady = !authLoading && (!isAuthenticated || !spacesLoading);

    return {
      // Combined authentication state
      user: auth.user,
      session: auth.session,
      isAuthenticated,

      // Combined spaces state
      spaces: spaces.spaces,
      currentSpace: spaces.currentSpace,
      hasZeroSpaces,

      // Combined loading states
      authLoading,
      profileLoading,
      spacesLoading,
      loading,

      // Combined error states
      authError,
      spacesError,
      error,

      // Authentication methods
      signUp: auth.signUp,
      signIn: auth.signIn,
      signOut: auth.signOut,
      refreshProfile: auth.refreshProfile,

      // Spaces methods
      switchSpace: spaces.switchSpace,
      refreshSpaces: spaces.refreshSpaces,
      createSpace: spaces.createSpace,
      deleteSpace: spaces.deleteSpace,

      // State helpers
      isReady,
    };
  }, [
    auth.user,
    auth.session,
    auth.loading,
    auth.profileLoading,
    auth.error,
    auth.signUp,
    auth.signIn,
    auth.signOut,
    auth.refreshProfile,
    spaces.spaces,
    spaces.currentSpace,
    spaces.loading,
    spaces.error,
    spaces.hasZeroSpaces,
    spaces.switchSpace,
    spaces.refreshSpaces,
    spaces.createSpace,
    spaces.deleteSpace,
  ]);

  return state;
}
