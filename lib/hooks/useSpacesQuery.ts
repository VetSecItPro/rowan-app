/**
 * React Query Spaces Hook
 *
 * Professional spaces data management replacing manual localStorage caching
 * Features: stale-while-revalidate, optimistic updates, intelligent invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';
import { supabase } from '@/lib/supabase';

/**
 * Space interface
 */
export interface Space {
  id: string;
  name: string;
  description: string | null;
  type: 'personal' | 'household' | 'family' | 'roommates' | 'friends';
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  role?: string; // User's role in this space
}

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
    queryFn: async (): Promise<Space[]> => {
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
            created_at,
            updated_at,
            settings
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { foreignTable: 'spaces', ascending: false });

      if (error) throw error;

      // Transform data to include role in space object
      return data
        .filter((item: any) => item.spaces) // Filter out any null spaces
        .map((item: any) => ({
          ...item.spaces,
          role: item.role,
        })) as Space[];
    },
    enabled: !!userId,
    ...QUERY_OPTIONS.spaces,
    // OPTIMIZED: Cache-first strategy for instant spaces loading
    refetchOnMount: false, // Use cached spaces data instead of always refetching
    staleTime: 8 * 60 * 1000, // 8 minutes - spaces don't change frequently
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
    queryFn: async (): Promise<Space | null> => {
      if (!userId) return null;

      // Try to get saved space from localStorage first
      const savedSpaceId = localStorage.getItem(`currentSpace_${userId}`);

      if (savedSpaceId) {
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
          } as unknown as Space;
        }

        // If saved space is invalid, clear it
        localStorage.removeItem(`currentSpace_${userId}`);
      }

      return null;
    },
    enabled: !!userId,
    ...QUERY_OPTIONS.spaces,
    // OPTIMIZED: Cache-first strategy for instant current space loading
    refetchOnMount: false, // Use cached current space instead of always refetching
    staleTime: 5 * 60 * 1000, // 5 minutes - current space changes less frequently
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

      return data.map((member: any) => ({
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
    // Loading states
    isLoading: spacesQuery.isLoading || currentSpaceQuery.isLoading,
    isRefetching: spacesQuery.isFetching || currentSpaceQuery.isFetching,

    // Data
    spaces,
    currentSpace,
    hasZeroSpaces,

    // Error states
    error: spacesQuery.error || currentSpaceQuery.error,
    isError: spacesQuery.isError || currentSpaceQuery.isError,

    // Actions
    refetch: () => {
      spacesQuery.refetch();
      currentSpaceQuery.refetch();
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
    mutationFn: async ({ space, userId }: { space: Space; userId: string }) => {
      // Save to localStorage for persistence
      localStorage.setItem(`currentSpace_${userId}`, space.id);
      return space;
    },
    // Optimistic update
    onMutate: async ({ space, userId }) => {
      const queryKey = QUERY_KEYS.spaces.current(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousSpace = queryClient.getQueryData<Space>(queryKey);

      // Optimistically update current space
      queryClient.setQueryData<Space>(queryKey, space);

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
      // Create the space
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          name,
          description,
          type,
          settings: {},
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
      } as Space;
    },
    // Invalidate cache on success
    onSuccess: (newSpace, { userId }) => {
      // Invalidate user spaces to refetch with new space
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.spaces.all(userId),
      });

      // Set as current space if it's the user's first space
      const existingSpaces = queryClient.getQueryData<Space[]>(
        QUERY_KEYS.spaces.all(userId)
      );

      if (!existingSpaces || existingSpaces.length <= 1) {
        queryClient.setQueryData(
          QUERY_KEYS.spaces.current(userId),
          newSpace
        );
        localStorage.setItem(`currentSpace_${userId}`, newSpace.id);
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
    mutationFn: async ({ spaceId, userId }: { spaceId: string; userId: string }) => {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
      return spaceId;
    },
    // Update cache on success
    onSuccess: (deletedSpaceId, { userId }) => {
      // Remove from spaces list
      const existingSpaces = queryClient.getQueryData<Space[]>(
        QUERY_KEYS.spaces.all(userId)
      );

      if (existingSpaces) {
        const updatedSpaces = existingSpaces.filter(space => space.id !== deletedSpaceId);
        queryClient.setQueryData(QUERY_KEYS.spaces.all(userId), updatedSpaces);
      }

      // Clear current space if it was the deleted one
      const currentSpace = queryClient.getQueryData<Space>(
        QUERY_KEYS.spaces.current(userId)
      );

      if (currentSpace?.id === deletedSpaceId) {
        queryClient.setQueryData(QUERY_KEYS.spaces.current(userId), null);
        localStorage.removeItem(`currentSpace_${userId}`);
      }

      // Invalidate space members cache
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.spaces.members(deletedSpaceId),
      });
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

  const handleSpacesChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        // Invalidate spaces list for affected users
        if (newRecord.user_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.spaces.all(newRecord.user_id),
          });
        }
        break;

      case 'UPDATE':
        // Update space in cache
        if (newRecord.space_id) {
          queryClient.invalidateQueries({
            queryKey: ['spaces'],
            predicate: (query) =>
              query.queryKey.includes(newRecord.space_id) ||
              query.queryKey.includes('all'),
          });
        }
        break;

      case 'DELETE':
        // Remove space from cache
        if (oldRecord.space_id && oldRecord.user_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.spaces.all(oldRecord.user_id),
          });
        }
        break;
    }
  };

  return handleSpacesChange;
}