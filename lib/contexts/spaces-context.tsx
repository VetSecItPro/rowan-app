'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Space } from '@/lib/types';
import { useAuth } from './auth-context';
import { featureFlags } from '@/lib/constants/feature-flags';
import { personalWorkspaceService } from '@/lib/services/personal-workspace-service';

/**
 * SPACES CONTEXT - PHASE 3
 *
 * Clean separation: Workspace management ONLY
 * - Spaces loading and management
 * - Current space selection
 * - Zero spaces detection and handling
 * - Space creation and deletion
 *
 * DEPENDS ON: AuthContext for user authentication
 * INTEGRATES WITH: Phase 1 UI components for proper UX
 *
 * This resolves zero-spaces scenarios and provides proper workspace UX.
 */

interface SpacesContextType {
  // Core spaces state
  spaces: (Space & { role: string })[];
  currentSpace: (Space & { role: string }) | null;
  loading: boolean;
  error: string | null;
  hasZeroSpaces: boolean;

  // Spaces management methods
  switchSpace: (space: Space & { role: string }) => void;
  refreshSpaces: () => Promise<void>;
  createSpace: (name: string) => Promise<{ success: boolean; spaceId?: string; error?: string }>;
  deleteSpace: (spaceId: string) => Promise<{ success: boolean; error?: string }>;

  // Zero-spaces helpers
  triggerOnboarding: () => void;
  skipOnboarding: () => void;
}

const SpacesContext = createContext<SpacesContextType | null>(null);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();

  const [spaces, setSpaces] = useState<(Space & { role: string })[]>([]);
  const [currentSpace, setCurrentSpace] = useState<(Space & { role: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasZeroSpaces, setHasZeroSpaces] = useState(false);

  // Clear any previous errors when starting new operations
  const clearError = () => setError(null);

  // Load user spaces (only called when user is authenticated)
  const loadUserSpaces = async (userId: string): Promise<void> => {
    if (loading) return; // Prevent concurrent loads

    try {
      clearError();
      setLoading(true);

      console.log('Loading spaces for user:', userId);

      const supabase = createClient();
      const { data: spacesData, error: spacesError } = await supabase
        .from('space_members')
        .select(`
          role,
          spaces (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (spacesError) {
        console.error('Spaces loading error:', spacesError);
        setError('Failed to load workspaces');
        setSpaces([]);
        setCurrentSpace(null);
        setHasZeroSpaces(true);
        return;
      }

      if (spacesData && spacesData.length > 0) {
        const userSpaces = spacesData.map((item: any) => ({
          ...item.spaces,
          role: item.role,
        }));

        console.log('Successfully loaded spaces:', userSpaces.length);
        setSpaces(userSpaces);
        setCurrentSpace(userSpaces[0]); // Select first space by default
        setHasZeroSpaces(false);
      } else {
        console.log('No shared spaces found for user');

        // FEATURE: Personal Workspaces - Auto-create if enabled
        if (featureFlags.isPersonalWorkspacesEnabled()) {
          console.log('Personal workspaces enabled - attempting to get/create personal space');

          try {
            const personalSpace = await personalWorkspaceService.ensurePersonalSpace(
              userId,
              user?.name // Pass user name for workspace naming
            );

            if (personalSpace) {
              // Treat personal space like a regular space
              const personalSpaceWithRole = {
                ...personalSpace,
                role: 'owner' // Personal space owner
              };

              console.log('Personal space ready:', personalSpace.name);
              setSpaces([personalSpaceWithRole]);
              setCurrentSpace(personalSpaceWithRole);
              setHasZeroSpaces(false);
              return; // Exit early - personal workspace is active
            }
          } catch (personalSpaceError) {
            console.warn('Personal workspace creation failed:', personalSpaceError);
            // Fall through to zero spaces scenario
          }
        }

        // FALLBACK: Original zero spaces logic (unchanged)
        console.log('No workspaces available - zero spaces scenario');
        setSpaces([]);
        setCurrentSpace(null);
        setHasZeroSpaces(true);
      }

    } catch (error) {
      console.error('Spaces loading failed:', error);
      setError('Failed to load workspaces');
      setSpaces([]);
      setCurrentSpace(null);
      setHasZeroSpaces(true);
    } finally {
      setLoading(false);
    }
  };

  // Load spaces when user authentication completes
  useEffect(() => {
    if (authLoading) {
      // Don't load spaces while auth is still loading
      return;
    }

    if (user && session) {
      // User is authenticated, load their spaces
      loadUserSpaces(user.id);
    } else {
      // No user, clear spaces state
      setSpaces([]);
      setCurrentSpace(null);
      setHasZeroSpaces(false);
      setLoading(false);
      clearError();
    }
  }, [user, session, authLoading]);

  const switchSpace = useCallback((space: Space & { role: string }) => {
    if (!space || !spaces.find(s => s.id === space.id)) {
      console.error('Attempted to switch to invalid space:', space);
      return;
    }

    console.log('Switching to space:', space.name);
    setCurrentSpace(space);
  }, [spaces]);

  const refreshSpaces = useCallback(async () => {
    if (user) {
      await loadUserSpaces(user.id);
    }
  }, [user]);

  const createSpace = useCallback(async (name: string): Promise<{ success: boolean; spaceId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/spaces/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create workspace');
      }

      // Refresh spaces after successful creation
      await loadUserSpaces(user.id);

      return {
        success: true,
        spaceId: result.data.id
      };

    } catch (error) {
      console.error('Error creating space:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workspace'
      };
    }
  }, [user]);

  const deleteSpace = useCallback(async (spaceId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await fetch(`/api/spaces/${spaceId}/delete`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete workspace');
      }

      // Refresh spaces after successful deletion
      await loadUserSpaces(user.id);

      return { success: true };

    } catch (error) {
      console.error('Error deleting space:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workspace'
      };
    }
  }, [user]);

  const triggerOnboarding = useCallback(() => {
    console.log('Triggering workspace onboarding');
    // This can be used to show the FirstSpaceOnboarding component
    // Implementation will depend on how we integrate with the app layout
  }, []);

  const skipOnboarding = useCallback(() => {
    console.log('Skipping workspace onboarding');
    // This allows users to skip the onboarding if they want
    setHasZeroSpaces(false);
  }, []);

  const value: SpacesContextType = useMemo(() => ({
    // Core spaces state
    spaces,
    currentSpace,
    loading,
    error,
    hasZeroSpaces,

    // Spaces management methods
    switchSpace,
    refreshSpaces,
    createSpace,
    deleteSpace,

    // Zero-spaces helpers
    triggerOnboarding,
    skipOnboarding,
  }), [
    spaces,
    currentSpace,
    loading,
    error,
    hasZeroSpaces,
    switchSpace,
    refreshSpaces,
    createSpace,
    deleteSpace,
    triggerOnboarding,
    skipOnboarding,
  ]);

  return (
    <SpacesContext.Provider value={value}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error('useSpaces must be used within SpacesProvider');
  }
  return context;
}

/**
 * Type definitions for TypeScript support
 */
export type { SpacesContextType };