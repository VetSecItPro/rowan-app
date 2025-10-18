'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserTimezone } from '@/lib/utils/timezone';
import type { User, Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  pronouns?: string;
  color_theme: string;
  timezone: string;
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
  timezone?: string;
  space_name?: string;
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
      console.log('Tracking user session...');
      const response = await fetch('/api/user/track-session', {
        method: 'POST',
      });
      const result = await response.json();
      console.log('Session tracking response:', result);
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadUserSpace(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
        loadUserSpace(session.user.id);

        // Track session on sign in
        if (event === 'SIGNED_IN') {
          trackUserSession().catch(err => {
            console.error('Failed to track session:', err);
            // Don't block login if session tracking fails
          });
        }
      } else {
        setUser(null);
        setCurrentSpace(null);
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
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://rowan-app.vercel.app/dashboard',
        }
      });

      if (error) return { error };
      if (!data.user) return { error: new Error('User creation failed') };

      const timezone = profile.timezone || getUserTimezone();

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        name: profile.name,
        pronouns: profile.pronouns,
        color_theme: profile.color_theme || 'emerald',
        timezone,
      });

      if (profileError) {
        console.error('Error creating user profile:', profileError);

        // CRITICAL: Delete the orphaned auth user to prevent account without profile
        try {
          const response = await fetch('/api/auth/cleanup-orphaned-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          });

          if (response.ok) {
            console.log('Cleaned up orphaned auth user');
          } else {
            console.error('Failed to cleanup orphaned auth user');
          }
        } catch (deleteError) {
          console.error('Failed to cleanup orphaned auth user:', deleteError);
        }

        // Return user-friendly error
        if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
          return { error: new Error('An account with this email already exists') };
        }
        return { error: new Error('Failed to create user profile') };
      }

      // Create space if provided (optional - don't block signup if it fails)
      if (profile.space_name) {
        try {
          const { data: space, error: spaceError } = await supabase
            .from('spaces')
            .insert({ name: profile.space_name })
            .select()
            .single();

          if (spaceError) {
            console.error('Error creating space:', spaceError);
            // Don't block signup - space creation is optional
          } else if (space) {
            // Add user as owner of the new space
            const { error: memberError } = await supabase.from('space_members').insert({
              space_id: space.id,
              user_id: data.user.id,
              role: 'owner',
            });

            if (memberError) {
              console.error('Error adding user to space:', memberError);
            } else {
              const spaceWithRole = { ...space, role: 'owner' };
              setSpaces([spaceWithRole]);
              setCurrentSpace(spaceWithRole);
            }
          }
        } catch (error) {
          console.error('Space creation failed (non-blocking):', error);
          // Continue with signup even if space creation fails
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error('Invalid email or password') };
        }
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSpaces([]);
      setCurrentSpace(null);
    } catch (error) {
      console.error('Sign out error:', error);
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
