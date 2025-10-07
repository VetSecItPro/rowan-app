'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserTimezone } from '@/lib/utils/timezone';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentSpace: { id: string; name: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, profile: ProfileData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentSpace, setCurrentSpace] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSpace(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSpace(session.user.id);
      } else {
        setCurrentSpace(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserSpace(userId: string) {
    try {
      const { data, error } = await supabase
        .from('space_members')
        .select('space_id, spaces(id, name)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading user space:', error);
        return;
      }

      if (data?.spaces) {
        // @ts-ignore - Supabase types are complex for nested selects
        setCurrentSpace(data.spaces);
      }
    } catch (error) {
      console.error('Error loading user space:', error);
    }
  }

  const signUp = async (email: string, password: string, profile: ProfileData) => {
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
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
        return { error: new Error('Failed to create user profile') };
      }

      // Create space if provided
      if (profile.space_name) {
        const { data: space, error: spaceError } = await supabase
          .from('spaces')
          .insert({ name: profile.space_name })
          .select()
          .single();

        if (spaceError) {
          console.error('Error creating space:', spaceError);
          return { error: new Error('Failed to create space') };
        }

        if (space) {
          const { error: memberError } = await supabase.from('space_members').insert({
            space_id: space.id,
            user_id: data.user.id,
            role: 'owner',
          });

          if (memberError) {
            console.error('Error adding user to space:', memberError);
          } else {
            setCurrentSpace(space);
          }
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
      setCurrentSpace(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, currentSpace, loading, signUp, signIn, signOut }}>
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
