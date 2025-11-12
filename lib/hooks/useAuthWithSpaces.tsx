'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useMemo } from 'react';

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
  user: any | null;
  session: any | null;
  isAuthenticated: boolean;

  // Combined spaces state
  spaces: any[];
  currentSpace: any | null;
  hasZeroSpaces: boolean;

  // Combined loading states
  authLoading: boolean;
  spacesLoading: boolean;
  loading: boolean; // True if either auth or spaces is loading

  // Combined error states
  authError: string | null;
  spacesError: string | null;
  error: string | null; // Primary error (auth takes precedence)

  // Authentication methods (from AuthContext)
  signUp: (email: string, password: string, profile: any) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Spaces methods (from SpacesContext)
  switchSpace: (space: any) => void;
  refreshSpaces: () => Promise<void>;
  createSpace: (name: string) => Promise<{ success: boolean; spaceId?: string; error?: string }>;
  deleteSpace: (spaceId: string) => Promise<{ success: boolean; error?: string }>;

  // Zero-spaces helpers
  triggerOnboarding: () => void;
  skipOnboarding: () => void;

  // State helpers
  isReady: boolean; // True when auth is complete and spaces are loaded (or confirmed zero)
  needsOnboarding: boolean; // True when user has zero spaces and should see onboarding
}

/**
 * Main integration hook - combines auth and spaces contexts
 */
export function useAuthWithSpaces(): AuthWithSpacesState {
  const auth = useAuth();
  const spaces = useSpaces();

  const state = useMemo(() => {
    // Authentication state
    const isAuthenticated = !!(auth.user && auth.session);
    const authLoading = auth.loading;
    const authError = auth.error;

    // Spaces state
    const spacesLoading = spaces.loading;
    const spacesError = spaces.error;
    const hasZeroSpaces = spaces.hasZeroSpaces;

    // Combined loading state
    const loading = authLoading || (isAuthenticated && spacesLoading);

    // Combined error state (auth errors take precedence)
    const error = authError || spacesError;

    // App readiness state
    const isReady = !authLoading && (!isAuthenticated || !spacesLoading);

    // Zero-spaces onboarding state
    const needsOnboarding = isAuthenticated && !spacesLoading && hasZeroSpaces;

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

      // Zero-spaces helpers
      triggerOnboarding: spaces.triggerOnboarding,
      skipOnboarding: spaces.skipOnboarding,

      // State helpers
      isReady,
      needsOnboarding,
    };
  }, [
    auth.user,
    auth.session,
    auth.loading,
    auth.error,
    spaces.spaces,
    spaces.currentSpace,
    spaces.loading,
    spaces.error,
    spaces.hasZeroSpaces
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
export function useZeroSpacesDetection() {
  const { isAuthenticated, hasZeroSpaces, authLoading, spacesLoading } = useAuthWithSpaces();

  return {
    shouldShowOnboarding: isAuthenticated && !authLoading && !spacesLoading && hasZeroSpaces,
    isCheckingSpaces: isAuthenticated && spacesLoading,
  };
}