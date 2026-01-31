/**
 * React Query Spaces Hook
 *
 * Professional spaces data management replacing manual localStorage caching
 * Features: stale-while-revalidate, optimistic updates, intelligent invalidation
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';
import { deduplicatedRequests } from '@/lib/react-query/request-deduplication';
import { createClient } from '@/lib/supabase/client';
import type { Space } from '@/lib/types';

type SpaceWithRole = Space & { role?: string };
type SpaceMemberWithSpace = { role: string; spaces: Space | null };
type SpaceMemberRow = Omit<SpaceMember, 'user_profile'> & { user_profiles?: SpaceMember['user_profile'] };
type SpaceChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

/**
 * Space member interface
 */
export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  user_profile?: {
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

/**
 * User spaces query hook
 *
 * Fetches all spaces for a user with their roles and metadata
 */
export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.spaces.all(userId || ''),
    queryFn: async (): Promise<SpaceWithRole[]> => {
      const supabase = createClient();
      if (!userId) throw new Error('User ID is required');

      // Quick existence check first (fast COUNT query)
      const { count: spacesCount, error: countError } = await supabase
        .from('space_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) throw countError;

      // Handle zero spaces immediately
      if (spacesCount === 0) {
        return [];
      }

      // Fetch full spaces data with user roles
      const { data, error } = await supabase
        .from('space_members')
        .select(`
          role,
          spaces:space_id (
            id,
            name,
            description,
            type,
            user_id,
            created_by,
            is_personal,
            auto_created,
            created_at,
            updated_at,
            settings
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { foreignTable: 'spaces', ascending: false });

      if (error) throw error;

      // Transform data to include role in space object
      const rows = (data ?? []) as SpaceMemberWithSpace[];
      return rows
        .filter((item) => item.spaces) // Filter out any null spaces
        .map((item) => ({
          ...item.spaces,
          role: item.role,
        })) as SpaceWithRole[];
    },
    enabled: !!userId,
    ...QUERY_OPTIONS.spaces,
  });
}

/**
 * Current space query hook
 *
 * Manages the user's currently selected space with localStorage persistence
 */
export function useCurrentSpace(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.spaces.current(userId || ''),
    queryFn: async (): Promise<SpaceWithRole | null> => {
      const supabase = createClient();
      if (!userId) return null;

      // Try to get saved space from localStorage first
      const savedSpaceId = localStorage.getItem(`currentSpace_${userId}`);

      const isValidUuid = savedSpaceId
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(savedSpaceId)
        : false;

      if (savedSpaceId && isValidUuid) {
        // Verify the saved space still exists and user has access
        const { data, error } = await supabase
        .from('space_members')
        .select(`
          role,
          spaces:space_id (
            id,
            name,
            description,
            type,
            user_id,
            created_by,
            is_personal,
            auto_created,
            created_at,
            updated_at,
            settings
          )
        `)
          .eq('user_id', userId)
          .eq('space_id', savedSpaceId)
          .single();

        if (!error && data?.spaces) {
          return {
            ...data.spaces,
            role: data.role,
          } as unknown as SpaceWithRole;
        }

        // If saved space is invalid, clear it
        localStorage.removeItem(`currentSpace_${userId}`);
      } else if (savedSpaceId && !isValidUuid) {
        localStorage.removeItem(`currentSpace_${userId}`);
      }

      return null;
    },
    enabled: !!userId,
    ...QUERY_OPTIONS.spaces,
  });
}

/**
 * Space members query hook
 *
 * Fetches members for a specific space
 */
export function useSpaceMembers(spaceId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.spaces.members(spaceId || ''),
    queryFn: async (): Promise<SpaceMember[]> => {
      const supabase = createClient();
      if (!spaceId) throw new Error('Space ID is required');

      const { data, error } = await supabase
        .from('space_members')
        .select(`
          id,
          space_id,
          user_id,
          role,
          joined_at,
          user_profiles:user_id (
            name,
            email,
            avatar_url
          )
        `)
        .eq('space_id', spaceId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const members = (data ?? []) as SpaceMemberRow[];
      return members.map((member) => ({
        ...member,
        user_profile: member.user_profiles,
      })) as SpaceMember[];
    },
    enabled: !!spaceId,
    ...QUERY_OPTIONS.spaces,
  });
}

/**
 * Combined spaces hook
 *
 * Provides all spaces data with coordinated loading states
 */
export function useSpaces(userId: string | undefined) {
  const spacesQuery = useUserSpaces(userId);
  const currentSpaceQuery = useCurrentSpace(userId);

  const spaces = spacesQuery.data || [];
  const currentSpace = currentSpaceQuery.data;
  const hasZeroSpaces = spacesQuery.isSuccess && spaces.length === 0;

  return {
    // Initial load = no data yet. Background refetches should NOT block the app.
    isLoading: spacesQuery.isLoading || currentSpaceQuery.isLoading,
    isRefetching: spacesQuery.isFetching || currentSpaceQuery.isFetching,

    // Data
    spaces,
    currentSpace,
    hasZeroSpaces,

    // Error states
    error: spacesQuery.error || currentSpaceQuery.error,
    isError: spacesQuery.isError || currentSpaceQuery.isError,

    // Actions with request deduplication
    refetch: () => {
      if (userId) {
        // Use coordinated refresh to prevent duplicate requests
        deduplicatedRequests.refreshSpaceData(userId);
      } else {
        // Fallback for cases without userId
        spacesQuery.refetch();
        currentSpaceQuery.refetch();
      }
    },
  };
}

/**
 * Switch current space mutation
 *
 * Updates the current space with cache updates and localStorage persistence
 */
export function useSwitchSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ space, userId }: { space: SpaceWithRole; userId: string }) => {
      // Use request deduplication for rapid space switching
      return deduplicatedRequests.switchSpace(userId, space.id, async () => {
        // Save to localStorage for persistence
        localStorage.setItem(`currentSpace_${userId}`, space.id);
        return space;
      });
    },
    // Optimistic update
    onMutate: async ({ space, userId }) => {
      const queryKey = QUERY_KEYS.spaces.current(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousSpace = queryClient.getQueryData<SpaceWithRole>(queryKey);

      // Optimistically update current space
      queryClient.setQueryData<SpaceWithRole>(queryKey, space);

      return { previousSpace };
    },
    // Revert on error
    onError: (err, { userId }, context) => {
      if (context?.previousSpace) {
        queryClient.setQueryData(
          QUERY_KEYS.spaces.current(userId),
          context.previousSpace
        );
      }
    },
  });
}

/**
 * Create space mutation
 *
 * Creates a new space with optimistic updates and cache invalidation
 */
export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      type,
      userId
    }: {
      name: string;
      description: string | null;
      type: Space['type'];
      userId: string;
    }) => {
      const supabase = createClient();
      const isPersonal = type === 'personal';

      // Create the space
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name,
          description,
          type,
          settings: {},
          user_id: userId,
          is_personal: isPersonal,
          auto_created: false,
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          space_id: space.id,
          user_id: userId,
          role: 'owner',
        });

      if (memberError) throw memberError;

      return {
        ...space,
        role: 'owner' as const,
      } as SpaceWithRole;
    },
    // OPTIMISTIC UPDATE: Show new space immediately
    onMutate: async ({ name, description, type, userId }) => {
      const spacesQueryKey = QUERY_KEYS.spaces.all(userId);
      const currentSpaceQueryKey = QUERY_KEYS.spaces.current(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: spacesQueryKey });

      // Snapshot previous values
      const previousSpaces = queryClient.getQueryData<SpaceWithRole[]>(spacesQueryKey);
      const previousCurrentSpace = queryClient.getQueryData<SpaceWithRole>(currentSpaceQueryKey);

      // Create optimistic space object
      const optimisticSpace: SpaceWithRole = {
        id: `temp_${Date.now()}`, // Temporary ID until server responds
        name,
        description,
        type,
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {},
        is_personal: type === 'personal',
        user_id: userId,
        auto_created: false,
      };

      // Optimistically add to spaces list
      const newSpaces = previousSpaces ? [...previousSpaces, optimisticSpace] : [optimisticSpace];
      queryClient.setQueryData(spacesQueryKey, newSpaces);

      // If user has no spaces, set as current space optimistically
      if (!previousSpaces || previousSpaces.length === 0) {
        queryClient.setQueryData(currentSpaceQueryKey, optimisticSpace);
        localStorage.setItem(`currentSpace_${userId}`, optimisticSpace.id);
      }

      return { previousSpaces, previousCurrentSpace, optimisticSpace };
    },
    // Update with real data on success
    onSuccess: (newSpace, { userId }, context) => {
      const spacesQueryKey = QUERY_KEYS.spaces.all(userId);
      const currentSpaceQueryKey = QUERY_KEYS.spaces.current(userId);

      // Replace optimistic space with real space data
      const spaces = queryClient.getQueryData<SpaceWithRole[]>(spacesQueryKey);
      if (spaces && context?.optimisticSpace) {
        const updatedSpaces = spaces.map(space =>
          space.id === context.optimisticSpace.id ? newSpace : space
        );
        queryClient.setQueryData(spacesQueryKey, updatedSpaces);
      }

      // Update current space with real ID if it was set optimistically
      const currentSpace = queryClient.getQueryData<SpaceWithRole>(currentSpaceQueryKey);
      if (currentSpace?.id === context?.optimisticSpace.id) {
        queryClient.setQueryData(currentSpaceQueryKey, newSpace);
        localStorage.setItem(`currentSpace_${userId}`, newSpace.id);
      }

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: spacesQueryKey });
    },
    // Revert optimistic updates on error
    onError: (error, { userId }, context) => {
      if (context?.previousSpaces) {
        queryClient.setQueryData(QUERY_KEYS.spaces.all(userId), context.previousSpaces);
      }
      if (context?.previousCurrentSpace) {
        queryClient.setQueryData(QUERY_KEYS.spaces.current(userId), context.previousCurrentSpace);
      } else if (!context?.previousCurrentSpace && context?.optimisticSpace) {
        // Remove optimistic current space if there was none before
        queryClient.setQueryData(QUERY_KEYS.spaces.current(userId), null);
        localStorage.removeItem(`currentSpace_${userId}`);
      }
    },
  });
}

/**
 * Delete space mutation
 *
 * Deletes a space with proper cache cleanup
 */
export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spaceId }: { spaceId: string; userId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
      return spaceId;
    },
    // OPTIMISTIC UPDATE: Remove space immediately
    onMutate: async ({ spaceId, userId }) => {
      const spacesQueryKey = QUERY_KEYS.spaces.all(userId);
      const currentSpaceQueryKey = QUERY_KEYS.spaces.current(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: spacesQueryKey });

      // Snapshot previous values
      const previousSpaces = queryClient.getQueryData<SpaceWithRole[]>(spacesQueryKey);
      const previousCurrentSpace = queryClient.getQueryData<SpaceWithRole>(currentSpaceQueryKey);

      // Optimistically remove from spaces list
      if (previousSpaces) {
        const optimisticSpaces = previousSpaces.filter(space => space.id !== spaceId);
        queryClient.setQueryData(spacesQueryKey, optimisticSpaces);
      }

      // Clear current space if it was the deleted one
      if (previousCurrentSpace?.id === spaceId) {
        // If there are other spaces, automatically switch to the first one
        const remainingSpaces = previousSpaces?.filter(space => space.id !== spaceId);
        const nextCurrentSpace = remainingSpaces?.[0] || null;

        queryClient.setQueryData(currentSpaceQueryKey, nextCurrentSpace);

        if (nextCurrentSpace) {
          localStorage.setItem(`currentSpace_${userId}`, nextCurrentSpace.id);
        } else {
          localStorage.removeItem(`currentSpace_${userId}`);
        }
      }

      return { previousSpaces, previousCurrentSpace };
    },
    // Clean up additional caches on success
    onSuccess: (deletedSpaceId) => {
      // Invalidate space members cache
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.spaces.members(deletedSpaceId),
      });
    },
    // Revert optimistic updates on error
    onError: (_error, { userId }, context) => {
      if (context?.previousSpaces) {
        queryClient.setQueryData(QUERY_KEYS.spaces.all(userId), context.previousSpaces);
      }
      if (context?.previousCurrentSpace) {
        queryClient.setQueryData(QUERY_KEYS.spaces.current(userId), context.previousCurrentSpace);
        localStorage.setItem(`currentSpace_${userId}`, context.previousCurrentSpace.id);
      }
    },
  });
}

/**
 * Join space mutation
 *
 * Handles space invitation acceptance
 */
export function useJoinSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      spaceId,
      userId,
      invitationToken
    }: {
      spaceId: string;
      userId: string;
      invitationToken: string;
    }) => {
      const supabase = createClient();
      // Validate invitation and join space (API call would handle this)
      const { data, error } = await supabase
        .rpc('join_space_with_invitation', {
          p_space_id: spaceId,
          p_user_id: userId,
          p_invitation_token: invitationToken,
        });

      if (error) throw error;
      return data;
    },
    // Invalidate cache on success
    onSuccess: (data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.spaces.all(userId),
      });
    },
  });
}

/**
 * Spaces state change handler
 *
 * Utility for handling real-time spaces updates
 */
export function useSpacesStateChange() {
  const queryClient = useQueryClient();

  const handleSpacesChange = useCallback((payload: SpaceChangePayload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const newSpaceId = typeof newRecord?.space_id === 'string' ? newRecord.space_id : null;
    const newUserId = typeof newRecord?.user_id === 'string' ? newRecord.user_id : null;
    const oldSpaceId = typeof oldRecord?.space_id === 'string' ? oldRecord.space_id : null;
    const oldUserId = typeof oldRecord?.user_id === 'string' ? oldRecord.user_id : null;

    switch (eventType) {
      case 'INSERT':
        // Invalidate spaces list for affected users
        if (newUserId) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.spaces.all(newUserId),
          });
        }
        break;

      case 'UPDATE':
        // Update space in cache
        if (newSpaceId) {
          queryClient.invalidateQueries({
            queryKey: ['spaces'],
            predicate: (query) =>
              query.queryKey.includes(newSpaceId) ||
              query.queryKey.includes('all'),
          });
        }
        break;

      case 'DELETE':
        // Remove space from cache
        if (oldSpaceId && oldUserId) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.spaces.all(oldUserId),
          });
        }
        break;
    }
  }, [queryClient]);

  return handleSpacesChange;
}
