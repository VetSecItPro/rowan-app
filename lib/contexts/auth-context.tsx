'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query/query-client';
import {
  useAuth as useAuthQuery,
  useSignOut,
  useUpdateProfile,
  useAuthStateChange,
  type UserProfile
} from '@/lib/hooks/useAuthQuery';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';

/**
 * NEW AUTHENTICATION CONTEXT - REACT QUERY VERSION
 *
 * Professional-grade auth management with React Query
 * Features:
 * - Automatic caching with stale-while-revalidate
 * - Background refetching for fresh data
 * - Optimistic updates for profile changes
 * - Request deduplication built-in
 * - Intelligent error handling with retries
 *
 * ELIMINATES:
 * - Manual localStorage caching
 * - Complex cache invalidation logic
 * - Race conditions in data loading
 * - Blocking authentication flows
 */

interface AuthContextType {
  // Core authentication state
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Authentication methods
  signUp: (email: string, password: string, profile: any) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Backward compatibility - these will be deprecated after SpacesContext is implemented
  // They return empty/null values to prevent breaking changes during transition
  spaces: (Space & { role: string })[]; // Always empty array (but properly typed)
  currentSpace: (Space & { role: string }) | null; // Always null (but properly typed)
  switchSpace: (space: Space & { role: string }) => void; // No-op function
  refreshSpaces: () => Promise<void>; // No-op async function
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Inner AuthProvider that uses React Query hooks
 * This component has access to the QueryClient context
 */
function InnerAuthProvider({ children }: { children: ReactNode }) {
  const authQuery = useAuthQuery();
  const signOutMutation = useSignOut();
  const updateProfileMutation = useUpdateProfile();
  const handleAuthStateChange = useAuthStateChange();

  // Set up real-time auth state change listener
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session);
    });

    return () => subscription.unsubscribe();
  }, [handleAuthStateChange]);

  // Authentication methods
  const signUp = async (email: string, password: string, profile: any) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: profile,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await signOutMutation.mutateAsync();
  };

  const refreshProfile = async () => {
    authQuery.refetch();
  };

  // Backward compatibility stubs (will be removed once SpacesContext is fully implemented)
  const spaces: (Space & { role: string })[] = [];
  const currentSpace: (Space & { role: string }) | null = null;
  const switchSpace = (_space: Space & { role: string }) => {
    // No-op for backward compatibility
  };
  const refreshSpaces = async () => {
    // No-op for backward compatibility
  };

  const contextValue: AuthContextType = {
    // Core state from React Query
    user: authQuery.profile || null,
    session: authQuery.session || null,
    loading: authQuery.isLoading,
    error: authQuery.error?.message || null,

    // Authentication methods
    signUp,
    signIn,
    signOut,
    refreshProfile,

    // Backward compatibility
    spaces,
    currentSpace,
    switchSpace,
    refreshSpaces,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Main AuthProvider that sets up QueryClient and DevTools
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerAuthProvider>
        {children}
      </InnerAuthProvider>
      {/* React Query DevTools for development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

/**
 * Hook to access auth context
 *
 * IMPORTANT: This hook now provides React Query-powered auth state
 * All data is automatically cached, refreshed, and synchronized
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Convenience hook for profile updates
 * Uses optimistic updates for instant UI feedback
 */
export function useProfileUpdate() {
  const updateProfileMutation = useUpdateProfile();

  return {
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    error: updateProfileMutation.error,
  };
}

// Export types for external use
export type { UserProfile, AuthContextType };

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
 *    - Request deduplication
 *    - Intelligent retry with exponential backoff
 *
 * 3. **Better Performance:**
 *    - Non-blocking auth loading
 *    - Optimistic updates for profile changes
 *    - Smart cache invalidation
 *
 * 4. **Developer Experience:**
 *    - React Query DevTools in development
 *    - Better error handling
 *    - TypeScript support throughout
 *
 * 5. **Reliability:**
 *    - Eliminates race conditions
 *    - Handles network errors gracefully
 *    - Automatic cache synchronization
 */