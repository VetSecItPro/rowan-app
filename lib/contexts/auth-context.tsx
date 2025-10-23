'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';
import { createSecureError, handleApiResponse, AUTH_ERROR_MESSAGES, logSecurityEvent } from '@/lib/utils/secure-error-handling';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  pronouns?: string;
  color_theme: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  spaces: (Space & { role: string })[];
  currentSpace: (Space & { role: string }) | null;
  loading: boolean;
  signUp: (email: string, password: string, profile: ProfileData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSpace: (space: Space & { role: string }) => void;
  refreshSpaces: () => Promise<void>;
}

interface ProfileData {
  name: string;
  pronouns?: string;
  color_theme?: string;
  space_name?: string;
  marketing_emails_enabled?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [spaces, setSpaces] = useState<(Space & { role: string })[]>([]);
  const [currentSpace, setCurrentSpace] = useState<(Space & { role: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  // Create SSR-compatible Supabase client that stores sessions in cookies
  // Memoize to prevent creating multiple instances
  const supabase = useMemo(() => createClient(), []);

  async function trackUserSession() {
    try {
      const response = await fetch('/api/user/track-session', {
        method: 'POST',
      });
      const result = await response.json();
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  }

  async function loadUserProfile(userId: string) {
    // Validate userId before making the query
    if (!userId || userId === 'undefined' || userId === 'null' || userId.length < 36) {
      console.warn('Invalid userId, skipping profile load:', userId);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // PGRST116 = no rows returned (user hasn't completed signup yet)
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        setUser(data as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  useEffect(() => {
    let hasLoadedInitialData = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadUserSpace(session.user.id);
        hasLoadedInitialData = true;

        // Track session for existing logged-in users
        trackUserSession().catch(err => {
          console.error('Failed to track existing session:', err);
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (session?.user) {
        // Load user data if we don't have it or if user ID changed
        if (!hasLoadedInitialData || !user || user.id !== session.user.id) {
          loadUserProfile(session.user.id);
          loadUserSpace(session.user.id);
          hasLoadedInitialData = true;
        }

        // Track session on actual sign-in events
        if (event === 'SIGNED_IN') {
          trackUserSession().catch(err => {
            console.error('Failed to track session:', err);
            // Don't block login if session tracking fails
          });
        }
        // TOKEN_REFRESHED and other events: keep existing data, don't track
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentSpace(null);
        hasLoadedInitialData = false;
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function loadUserSpace(userId: string) {
    // Validate userId before making the query
    if (!userId || userId === 'undefined' || userId === 'null' || userId.length < 36) {
      console.warn('Invalid userId, skipping space load:', userId);
      setSpaces([]);
      setCurrentSpace(null);
      return;
    }

    try {
      const { data, error } = await supabase
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

      // Gracefully handle all errors (user might not have spaces yet)
      if (error) {
        console.log('User has no spaces yet or error loading spaces:', error.message);
        setSpaces([]);
        setCurrentSpace(null);
        return;
      }

      // Handle case where user has no spaces yet (silently)
      if (!data || data.length === 0) {
        console.log('User has no spaces yet');
        setSpaces([]);
        setCurrentSpace(null);
        return;
      }

      // Transform data to include role at top level
      const userSpaces = data.map((item: any) => ({
        ...item.spaces,
        role: item.role,
      }));

      setSpaces(userSpaces);

      // Set current space to first one if not already set
      if (!currentSpace && userSpaces.length > 0) {
        setCurrentSpace(userSpaces[0]);
      }
    } catch (error) {
      console.log('Exception loading user spaces (non-blocking):', error);
      // Don't block login - user can create/join spaces later
      setSpaces([]);
      setCurrentSpace(null);
    }
  }

  const signUp = async (email: string, password: string, profile: ProfileData) => {
    try {
      // Call secure, rate-limited signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          profile: {
            ...profile,
            color_theme: profile.color_theme || 'purple',
          },
        }),
      });

      // Use secure API response handler
      const result = await handleApiResponse(response, 'signup');

      // If we reach here, the response was successful
      return { error: null };
    } catch (error) {
      // Log security event for monitoring
      logSecurityEvent('signup_error', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email for privacy
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      }, 'medium');

      // Create secure error for user display
      const secureError = createSecureError(error, 'signup', AUTH_ERROR_MESSAGES.SIGNUP_FAILED);

      return { error: new Error(secureError.userMessage) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Call secure, rate-limited signin API
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // Use secure API response handler
      const result = await handleApiResponse(response, 'signin');

      // If we reach here, the response was successful
      return { error: null };
    } catch (error) {
      // Log security event for monitoring
      logSecurityEvent('signin_error', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email for privacy
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      }, 'medium');

      // Create secure error for user display
      const secureError = createSecureError(error, 'signin', AUTH_ERROR_MESSAGES.SIGNIN_FAILED);

      return { error: new Error(secureError.userMessage) };
    }
  };

  const signOut = async () => {
    try {
      // Call secure, rate-limited signout API
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Clear local state regardless of API response (for better UX)
      setSpaces([]);
      setCurrentSpace(null);

      if (!response.ok) {
        const result = await response.json();
        console.warn('Signout API warning:', result.error);
        // Don't throw error - user is effectively signed out locally
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local state even if API call fails
      setSpaces([]);
      setCurrentSpace(null);
    }
  };

  const switchSpace = (space: Space & { role: string }) => {
    setCurrentSpace(space);
  };

  const refreshSpaces = async () => {
    if (session?.user?.id) {
      await loadUserSpace(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      spaces,
      currentSpace,
      loading,
      signUp,
      signIn,
      signOut,
      switchSpace,
      refreshSpaces
    }}>
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
