/**
 * React Query Auth Hook
 *
 * Professional auth data management replacing manual localStorage caching
 * Features: stale-while-revalidate, background refetching, intelligent caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';
import { deduplicatedRequests } from '@/lib/react-query/request-deduplication';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  timezone?: string;
  preferences?: Record<string, any>;
}

/**
 * Auth session query hook
 *
 * Manages user session with automatic refresh and caching
 */
export function useAuthSession() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.session(),
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    ...QUERY_OPTIONS.auth,
    // EMERGENCY FIX: Always refetch to prevent perpetual loading with stale cache
    refetchOnMount: true, // Always fetch fresh session data on mount
    staleTime: 30 * 1000, // 30 seconds - balanced caching without breaking loading states
    refetchInterval: 5 * 60 * 1000, // Still refresh every 5 minutes in background
    refetchIntervalInBackground: false,
  });
}

/**
 * User profile query hook
 *
 * Fetches and caches user profile data with background refresh
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.auth.profile(userId || ''),
    queryFn: async (): Promise<UserProfile> => {
      const supabase = createClient();
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create minimal profile from auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No authenticated user found');

        return {
          id: user.id,
          email: user.email || '',
          name: user.email?.split('@')[0] || 'User',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {},
        };
      }

      return data;
    },
    enabled: !!userId, // Only run query if userId exists
    ...QUERY_OPTIONS.auth,
    // EMERGENCY FIX: Always refetch to prevent perpetual loading with stale cache
    refetchOnMount: true, // Always fetch fresh profile data on mount
    staleTime: 30 * 1000, // 30 seconds - balanced caching without breaking loading states
  });
}

/**
 * Combined auth hook
 *
 * Provides both session and profile data with coordinated loading states
 */
export function useAuth() {
  const sessionQuery = useAuthSession();
  const profileQuery = useUserProfile(sessionQuery.data?.user?.id);

  // EMERGENCY FIX: Include isFetching to cover background refetch scenarios
  const isLoading = sessionQuery.isLoading || sessionQuery.isFetching;
  const isProfileLoading = profileQuery.isLoading || profileQuery.isFetching;
  const error = sessionQuery.error || profileQuery.error;

  // Determine auth state
  const isAuthenticated = !!sessionQuery.data?.user && !error;
  const user = sessionQuery.data?.user;
  const profile = profileQuery.data;

  return {
    // Loading states
    isLoading,
    isProfileLoading,
    isRefetching: sessionQuery.isFetching || profileQuery.isFetching,

    // Data
    session: sessionQuery.data,
    user,
    profile,
    isAuthenticated,

    // Error states
    error,
    isError: sessionQuery.isError || profileQuery.isError,

    // Actions
    refetch: () => {
      sessionQuery.refetch();
      profileQuery.refetch();
    },
  };
}

/**
 * Profile update mutation
 *
 * Updates user profile with optimistic updates and cache invalidation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user');

      // Use request deduplication for rapid profile updates
      return deduplicatedRequests.updateProfile(user.id, async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    // Optimistic update
    onMutate: async (updates) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const queryKey = QUERY_KEYS.auth.profile(user.id);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKey);

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKey, {
          ...previousProfile,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousProfile };
    },
    // Revert on error
    onError: async (err, updates, context) => {
      const supabase = createClient();
      if (context?.previousProfile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          queryClient.setQueryData(
            QUERY_KEYS.auth.profile(user.id),
            context.previousProfile
          );
        }
      }
    },
    // Invalidate cache on success
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.auth.profile(data.id),
      });
    },
  });
}

/**
 * Sign out mutation
 *
 * Handles sign out with proper cache cleanup
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Clear all auth-related cache
      queryClient.clear();
    },
  });
}

/**
 * Auth state change handler
 *
 * Utility for handling real-time auth state changes
 */
export function useAuthStateChange() {
  const queryClient = useQueryClient();

  const handleAuthStateChange = (event: string, session: any) => {
    switch (event) {
      case 'SIGNED_IN':
        // Invalidate auth queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        break;
      case 'SIGNED_OUT':
        // Clear all cache on sign out
        queryClient.clear();
        break;
      case 'TOKEN_REFRESHED':
        // Update session in cache
        queryClient.setQueryData(QUERY_KEYS.auth.session(), session);
        break;
    }
  };

  return handleAuthStateChange;
}
