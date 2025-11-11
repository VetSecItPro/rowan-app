'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';

/**
 * NEW AUTHENTICATION CONTEXT - PHASE 2
 *
 * Clean separation of concerns: Authentication ONLY
 * - Session management
 * - User profile loading
 * - Authentication methods
 *
 * REMOVED from this context:
 * - Spaces management (moved to SpacesContext in Phase 3)
 * - currentSpace logic
 * - Space-related methods
 *
 * This resolves race conditions and zero-spaces handling issues.
 */

interface UserProfile {
  id: string;
  email: string;
  name: string;
  pronouns?: string;
  color_theme: string;
  avatar_url?: string;
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear any previous errors when starting new operations
  const clearError = () => setError(null);

  // Load user profile data only (spaces moved to separate context)
  const loadUserProfile = async (userId: string): Promise<void> => {
    try {
      clearError();
      const supabase = createClient();

      console.log('Loading user profile for:', userId);

      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile loading timeout')), 10000)
      );

      const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as any;

      console.log('Profile query completed, checking results...');

      if (profileError) {
        console.error('Profile loading error:', profileError);

        // For missing profiles, create basic user info from session
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating basic user info');
          const sessionData = await supabase.auth.getSession();
          setUser({
            id: userId,
            email: sessionData.data.session?.user?.email || '',
            name: sessionData.data.session?.user?.email?.split('@')[0] || 'User',
            pronouns: undefined,
            color_theme: 'light',
            avatar_url: undefined,
          });
          console.log('Basic user info set from session');
          return;
        }

        // For other errors, set error state but still try to set basic user info
        console.log('Setting fallback user info due to profile error');
        setError('Failed to load user profile');
        setUser({
          id: userId,
          email: '',
          name: 'User',
          pronouns: undefined,
          color_theme: 'light',
          avatar_url: undefined,
        });
        console.log('Fallback user info set');
        return;
      }

      if (profile) {
        console.log('Successfully loaded user profile:', profile);
        setUser({
          id: profile.id,
          email: profile.email || '',
          name: profile.name || profile.email || 'User',
          pronouns: profile.pronouns,
          color_theme: profile.color_theme || 'light',
          avatar_url: profile.avatar_url,
        });
        console.log('User profile set successfully');
      } else {
        console.log('No profile data returned, setting minimal user info');
        setUser({
          id: userId,
          email: '',
          name: 'User',
          pronouns: undefined,
          color_theme: 'light',
          avatar_url: undefined,
        });
      }

    } catch (error) {
      console.error('User profile loading failed:', error);
      setError('Failed to load user profile');

      // Set minimal user data to prevent total failure
      console.log('Setting minimal user data due to catch block');
      setUser({
        id: userId,
        email: '',
        name: 'User',
        pronouns: undefined,
        color_theme: 'light',
        avatar_url: undefined,
      });
      console.log('Minimal user data set in catch block');
    }

    console.log('loadUserProfile function completed');
  };

  // Initialize authentication on mount
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Session retrieval error:', sessionError);
        setError('Failed to retrieve session');
        setLoading(false);
        return;
      }

      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);

      setLoading(true);
      clearError();
      setSession(session);

      try {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          // Clear user data on logout
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setError('Failed to load user data');
      } finally {
        // Always set loading to false, even if profile loading fails
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, profile: any) => {
    try {
      clearError();
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          profile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Signup failed';
        setError(errorMessage);
        return { error: new Error(errorMessage) };
      }

      return { error: null };
    } catch (error) {
      const errorMessage = 'Signup failed';
      setError(errorMessage);
      return { error: error as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      clearError();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }

      return { error };
    } catch (error) {
      const errorMessage = 'Sign in failed';
      setError(errorMessage);
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      clearError();
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
      // Still clear user data even if sign out fails
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  }, [session?.user]);

  // Backward compatibility methods (deprecated - will be removed in Phase 4)
  const spaces: (Space & { role: string })[] = useMemo(() => [], []);
  const currentSpace: (Space & { role: string }) | null = useMemo(() => null, []);
  const switchSpace = useCallback((space: Space & { role: string }) => {
    console.warn('switchSpace is deprecated - use SpacesContext instead');
  }, []);
  const refreshSpaces = useCallback(async () => {
    console.warn('refreshSpaces is deprecated - use SpacesContext instead');
  }, []);

  const value: AuthContextType = useMemo(() => ({
    // Core authentication state
    user,
    session,
    loading,
    error,

    // Authentication methods
    signUp,
    signIn,
    signOut,
    refreshProfile,

    // Backward compatibility (deprecated)
    spaces,
    currentSpace,
    switchSpace,
    refreshSpaces,
  }), [
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    spaces,
    currentSpace,
    switchSpace,
    refreshSpaces,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Type definitions for TypeScript support
 */
export type { UserProfile, AuthContextType };