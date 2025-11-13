'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import {
  useSpaces as useSpacesQuery,
  useSwitchSpace,
  useCreateSpace,
  useDeleteSpace,
  useSpacesStateChange,
} from '@/lib/hooks/useSpacesQuery';
import type { Space } from '@/lib/types';
import { useAuth } from './auth-context';
import { createClient } from '@/lib/supabase/client';
import { featureFlags } from '@/lib/constants/feature-flags';
import { personalWorkspaceService } from '@/lib/services/personal-workspace-service';

/**
 * NEW SPACES CONTEXT - REACT QUERY VERSION
 *
 * Professional-grade workspace management with React Query
 * Features:
 * - Automatic caching with stale-while-revalidate
 * - Optimistic updates for space switching
 * - Background refetching for fresh data
 * - Intelligent cache invalidation
 * - Zero-spaces handling with smooth UX
 *
 * ELIMINATES:
 * - Manual localStorage caching
 * - Complex cache expiration logic
 * - Race conditions in space loading
 * - Blocking space operations
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
  const [ensuringPersonalSpace, setEnsuringPersonalSpace] = useState(false);
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false);

  // React Query powered spaces data
  const spacesQuery = useSpacesQuery(user?.id);
  const switchSpaceMutation = useSwitchSpace();
  const createSpaceMutation = useCreateSpace();
  const deleteSpaceMutation = useDeleteSpace();
  const handleSpacesChange = useSpacesStateChange();

  // Set up real-time spaces change listener
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();

    const spacesChannel = supabase
      .channel('spaces-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_members',
          filter: `user_id=eq.${user?.id}`,
        },
        handleSpacesChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spaces',
        },
        handleSpacesChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(spacesChannel);
    };
  }, [session, user?.id, handleSpacesChange]);

  // Ensure every user has at least one (personal) space for solo usage
  useEffect(() => {
    if (!featureFlags.isPersonalWorkspacesEnabled()) return;
    if (!user?.id) return;
    if (authLoading) return;
    if (ensuringPersonalSpace || autoCreateAttempted) return;

    const hasSpaces = (spacesQuery.spaces?.length || 0) > 0;
    if (spacesQuery.isLoading || spacesQuery.isFetching) return;
    if (hasSpaces) return;

    const preferredName =
      user.name ||
      user.email?.split('@')[0] ||
      undefined;

    setEnsuringPersonalSpace(true);
    personalWorkspaceService
      .ensurePersonalSpace(user.id, preferredName)
      .then((personalSpace) => {
        if (personalSpace?.id) {
          try {
            localStorage.setItem(`currentSpace_${user.id}`, personalSpace.id);
          } catch (error) {
            console.warn('[SpacesProvider] Unable to persist personal space selection:', error);
          }
        }
        spacesQuery.refetch();
      })
      .catch((error) => {
        console.error('[SpacesProvider] Failed to auto-create personal space:', error);
      })
      .finally(() => {
        setEnsuringPersonalSpace(false);
        setAutoCreateAttempted(true);
      });
  }, [
    authLoading,
    ensuringPersonalSpace,
    autoCreateAttempted,
    spacesQuery.isFetching,
    spacesQuery.isLoading,
    spacesQuery.spaces,
    user?.email,
    user?.id,
    user?.name,
  ]);

  // Spaces management methods
  const switchSpace = (space: Space & { role: string }) => {
    if (!user?.id) return;

    switchSpaceMutation.mutate({
      space,
      userId: user.id,
    });
  };

  const refreshSpaces = async () => {
    spacesQuery.refetch();
  };

  const createSpace = async (name: string): Promise<{ success: boolean; spaceId?: string; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const newSpace = await createSpaceMutation.mutateAsync({
        name,
        description: null,
        type: 'household',
        userId: user.id,
      });

      return {
        success: true,
        spaceId: newSpace.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create space',
      };
    }
  };

  const deleteSpace = async (spaceId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      await deleteSpaceMutation.mutateAsync({
        spaceId,
        userId: user.id,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete space',
      };
    }
  };

  // Zero-spaces onboarding helpers
  const triggerOnboarding = () => {
    if (featureFlags.isSmartOnboardingEnabled()) {
      // Placeholder for onboarding trigger logic
      console.log('Onboarding triggered');
    }
  };

  const skipOnboarding = () => {
    if (featureFlags.isSmartOnboardingEnabled()) {
      // Placeholder for onboarding skip logic
      console.log('Onboarding skipped');
    }
  };

  const contextValue: SpacesContextType = {
    // Core state from React Query
    spaces: spacesQuery.spaces as (Space & { role: string })[],
    currentSpace: spacesQuery.currentSpace as (Space & { role: string }) | null,
    loading: spacesQuery.isLoading || authLoading || ensuringPersonalSpace,
    error: spacesQuery.error?.message || null,
    hasZeroSpaces: !ensuringPersonalSpace && spacesQuery.hasZeroSpaces,

    // Management methods
    switchSpace,
    refreshSpaces,
    createSpace,
    deleteSpace,

    // Zero-spaces helpers
    triggerOnboarding,
    skipOnboarding,
  };

  return (
    <SpacesContext.Provider value={contextValue}>
      {children}
    </SpacesContext.Provider>
  );
}

/**
 * Hook to access spaces context
 *
 * IMPORTANT: This hook now provides React Query-powered spaces state
 * All data is automatically cached, refreshed, and synchronized
 */
export function useSpaces(): SpacesContextType {
  const context = useContext(SpacesContext);

  if (!context) {
    throw new Error('useSpaces must be used within a SpacesProvider');
  }

  return context;
}

/**
 * Convenience hook for space operations
 * Provides optimistic updates and loading states
 */
export function useSpaceOperations() {
  const createSpaceMutation = useCreateSpace();
  const deleteSpaceMutation = useDeleteSpace();
  const switchSpaceMutation = useSwitchSpace();

  return {
    // Create space
    createSpace: createSpaceMutation.mutate,
    isCreatingSpace: createSpaceMutation.isPending,
    createError: createSpaceMutation.error,

    // Delete space
    deleteSpace: deleteSpaceMutation.mutate,
    isDeletingSpace: deleteSpaceMutation.isPending,
    deleteError: deleteSpaceMutation.error,

    // Switch space
    switchSpace: switchSpaceMutation.mutate,
    isSwitchingSpace: switchSpaceMutation.isPending,
    switchError: switchSpaceMutation.error,
  };
}

/**
 * MIGRATION BENEFITS:
 *
 * 1. **Eliminates Manual Caching:**
 *    - No more localStorage cache management
 *    - No cache expiration logic
 *    - No cache corruption handling
 *
 * 2. **Professional Data Management:**
 *    - Automatic background refetching
 *    - Stale-while-revalidate patterns
 *    - Intelligent cache invalidation
 *    - Optimistic updates for space operations
 *
 * 3. **Better Performance:**
 *    - Instant space switching with optimistic updates
 *    - Non-blocking space operations
 *    - Smart cache invalidation
 *
 * 4. **Enhanced Reliability:**
 *    - Real-time synchronization
 *    - Automatic error recovery
 *    - Network-aware caching
 *
 * 5. **Developer Experience:**
 *    - React Query DevTools integration
 *    - Better error handling
 *    - TypeScript support throughout
 *    - Simplified state management
 */
