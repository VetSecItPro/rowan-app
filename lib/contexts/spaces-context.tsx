'use client';

import { createContext, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
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

interface SpacesContextType {
  spaces: (Space & { role: string })[];
  currentSpace: (Space & { role: string }) | null;
  loading: boolean;
  error: string | null;
  hasZeroSpaces: boolean;
  switchSpace: (space: Space & { role: string }) => void;
  refreshSpaces: () => Promise<void>;
  createSpace: (name: string) => Promise<{ success: boolean; spaceId?: string; error?: string }>;
  deleteSpace: (spaceId: string) => Promise<{ success: boolean; error?: string }>;
}

const SpacesContext = createContext<SpacesContextType | null>(null);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const hasInitializedSpace = useRef(false);

  const spacesQuery = useSpacesQuery(user?.id);
  const switchSpaceMutation = useSwitchSpace();
  const createSpaceMutation = useCreateSpace();
  const deleteSpaceMutation = useDeleteSpace();
  const handleSpacesChange = useSpacesStateChange();

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

  const switchSpace = useCallback((space: Space & { role: string }) => {
    if (!user?.id) return;

    switchSpaceMutation.mutate({
      space,
      userId: user.id,
    });
  }, [switchSpaceMutation, user]);

  const refreshSpaces = useCallback(async () => {
    spacesQuery.refetch();
  }, [spacesQuery]);

  const createSpace = useCallback(async (name: string): Promise<{ success: boolean; spaceId?: string; error?: string }> => {
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
  }, [createSpaceMutation, user]);

  const deleteSpace = useCallback(async (spaceId: string): Promise<{ success: boolean; error?: string }> => {
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
  }, [deleteSpaceMutation, user]);

  useEffect(() => {
    if (!user?.id) return;
    if (hasInitializedSpace.current) return;
    if (authLoading) return;
    if (spacesQuery.isLoading || spacesQuery.isRefetching) return;

    if (!spacesQuery.spaces?.length) {
      hasInitializedSpace.current = true;
      return;
    }

    if (spacesQuery.currentSpace) {
      hasInitializedSpace.current = true;
      return;
    }

    const firstSpace = spacesQuery.spaces[0];
    if (firstSpace && firstSpace.role) {
      switchSpace(firstSpace as Space & { role: string });
    }
    hasInitializedSpace.current = true;
  }, [
    authLoading,
    spacesQuery.currentSpace,
    spacesQuery.isRefetching,
    spacesQuery.isLoading,
    spacesQuery.spaces,
    switchSpace,
    user?.id,
  ]);

  const contextValue: SpacesContextType = {
    spaces: spacesQuery.spaces as (Space & { role: string })[],
    currentSpace: spacesQuery.currentSpace as (Space & { role: string }) | null,
    loading: spacesQuery.isLoading || authLoading,
    error: spacesQuery.error?.message || null,
    hasZeroSpaces: spacesQuery.hasZeroSpaces,
    switchSpace,
    refreshSpaces,
    createSpace,
    deleteSpace,
  };

  return (
    <SpacesContext.Provider value={contextValue}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces(): SpacesContextType {
  const context = useContext(SpacesContext);

  if (!context) {
    throw new Error('useSpaces must be used within a SpacesProvider');
  }

  return context;
}

export function useSpaceOperations() {
  const createSpaceMutation = useCreateSpace();
  const deleteSpaceMutation = useDeleteSpace();
  const switchSpaceMutation = useSwitchSpace();

  return {
    createSpace: createSpaceMutation.mutate,
    isCreatingSpace: createSpaceMutation.isPending,
    createError: createSpaceMutation.error,
    deleteSpace: deleteSpaceMutation.mutate,
    isDeletingSpace: deleteSpaceMutation.isPending,
    deleteError: deleteSpaceMutation.error,
    switchSpace: switchSpaceMutation.mutate,
    isSwitchingSpace: switchSpaceMutation.isPending,
    switchError: switchSpaceMutation.error,
  };
}
