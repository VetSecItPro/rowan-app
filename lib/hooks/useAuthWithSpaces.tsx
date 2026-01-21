'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useMemo, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * UNIFIED AUTH WITH SPACES HOOK - PHASE 3 INTEGRATION
 *
 * Provides a unified interface combining AuthContext and SpacesContext
 * - Maintains backward compatibility during migration
 * - Handles complex state interactions between auth and spaces
 * - Provides comprehensive loading and error states
 * - Manages zero-spaces scenarios properly
 *
 * This hook will gradually replace direct useAuth() calls as we migrate
 * components to use the new separated architecture.
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
  const [emergencyTimeoutReached, setEmergencyTimeoutReached] = useState(false);

  // Emergency timeout to prevent perpetual loading (15 seconds max)
  useEffect(() => {
    const isLoading = auth.loading || (!!auth.user && spaces.loading);

    if (isLoading && !emergencyTimeoutReached) {
      const emergencyTimeout = setTimeout(() => {
        logger.warn('[useAuthWithSpaces] Emergency timeout reached - forcing loading completion', { component: 'lib-useAuthWithSpaces' });
        setEmergencyTimeoutReached(true);
      }, 15000); // 15 second emergency timeout

      return () => clearTimeout(emergencyTimeout);
    }
  }, [auth.loading, spaces.loading, auth.user, emergencyTimeoutReached]);

  const state = useMemo(() => {
    // Authentication state
    const isAuthenticated = !!(auth.user && auth.session);

    // Apply emergency timeout overrides
    const authLoading = emergencyTimeoutReached ? false : auth.loading;
    const spacesLoading = emergencyTimeoutReached ? false : spaces.loading;

    const authError = auth.error;
    const spacesError = spaces.error;
    const hasZeroSpaces = spaces.hasZeroSpaces;

    // Combined loading state (forced to false if emergency timeout reached)
    const loading = emergencyTimeoutReached ? false : (authLoading || (isAuthenticated && spacesLoading));

    // Combined error state (auth errors take precedence, add timeout error if needed)
    const timeoutError = emergencyTimeoutReached ? 'Loading timeout - some data may be incomplete' : null;
    const error = authError || spacesError || timeoutError;

    // App readiness state (forced ready if emergency timeout reached)
    const isReady = emergencyTimeoutReached ? true : (!authLoading && (!isAuthenticated || !spacesLoading));

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
    emergencyTimeoutReached,
  ]);

  return state;
}

/**
 * Backward compatibility hook - maintains existing useAuth interface
 *
 * This allows existing components to continue working unchanged during
 * the migration period. Gradually replace with useAuthWithSpaces() or
 * separate useAuth() and useSpaces() calls.
 */
export function useAuthLegacy() {
  const {
    user,
    session,
    spaces,
    currentSpace,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    switchSpace,
    refreshSpaces
  } = useAuthWithSpaces();

  // Return the exact same interface as the old useAuth hook
  return {
    user,
    session,
    spaces,
    currentSpace,
    loading,
    signUp,
    signIn,
    signOut,
    switchSpace,
    refreshSpaces,
    refreshProfile,
    // Note: error is now available but wasn't in the old interface
    error,
  };
}

/**
 * Zero-spaces detection hook for triggering onboarding
 */
