/**
 * React Query Auth Hook
 *
 * Professional auth data management replacing manual localStorage caching
 * Features: stale-while-revalidate, background refetching, intelligent caching
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';
import { deduplicatedRequests } from '@/lib/react-query/request-deduplication';
import { createClient } from '@/lib/supabase/client';
import { clearPersistedCache, clearAllAppStorage, markSigningOut } from '@/lib/react-query/offline-persistence';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

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
  color_theme?: string;
  pronouns?: string;
  preferences?: Record<string, unknown>;
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
    refetchInterval: 5 * 60 * 1000,
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
        .from('users')
        .select('id, email, name, avatar_url, created_at, updated_at, timezone, privacy_settings, color_theme')
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

      // Map database fields to UserProfile interface
      return {
        ...data,
        name: data.name || data.email?.split('@')[0] || 'User',
        preferences: data.privacy_settings || {},
      } as UserProfile;
    },
    enabled: !!userId, // Only run query if userId exists
    ...QUERY_OPTIONS.auth,
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

  // isLoading = true only on initial fetch (no cached data). isFetching covers background refetches.
  const isLoading = sessionQuery.isLoading;
  const isProfileLoading = profileQuery.isLoading;
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
    mutationFn: async (updates: Partial<UserProfile>): Promise<UserProfile> => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user');

      // Use request deduplication for rapid profile updates
      return deduplicatedRequests.updateProfile(user.id, async () => {
        const { data, error } = await supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserProfile;
      }) as Promise<UserProfile>;
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
    onSuccess: (data: UserProfile) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.auth.profile(data.id),
      });
    },
  });
}

/**
 * Sign out mutation
 *
 * Handles sign out with FULL cache cleanup:
 * 1. Supabase session (cookies)
 * 2. In-memory React Query cache
 * 3. IndexedDB persisted cache
 * 4. localStorage backup cache
 * 5. All app-scoped localStorage keys (currentSpace, preferences)
 *
 * This prevents cross-user data leakage when a different user
 * logs in on the same browser.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      // Flag signout to prevent beforeunload from re-saving stale cache
      markSigningOut();
      // 1. Clear in-memory React Query cache
      queryClient.clear();
      // 2. Clear IndexedDB + localStorage backup cache
      await clearPersistedCache();
      // 3. Clear all app-scoped localStorage (currentSpace, preferences, etc.)
      clearAllAppStorage();
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

  const handleAuthStateChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    switch (event) {
      case 'SIGNED_IN':
        // Clear ALL persistent caches first — prevents cross-user data leakage
        // when a different user logs in on the same browser. Then invalidate
        // to refetch fresh data for the new user.
        queryClient.clear();
        clearPersistedCache();
        clearAllAppStorage();
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        break;
      case 'SIGNED_OUT':
        // Flag signout to prevent beforeunload from re-saving stale cache
        markSigningOut();
        // Full cache cleanup — prevents cross-user data leakage
        queryClient.clear();
        clearPersistedCache();
        clearAllAppStorage();
        break;
      case 'TOKEN_REFRESHED':
        // Update session in cache
        queryClient.setQueryData(QUERY_KEYS.auth.session(), session);
        break;
    }
  }, [queryClient]);

  return handleAuthStateChange;
}
