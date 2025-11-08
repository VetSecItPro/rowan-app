'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';

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
  signUp: (email: string, password: string, profile: any) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSpace: (space: Space & { role: string }) => void;
  refreshSpaces: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [spaces, setSpaces] = useState<(Space & { role: string })[]>([]);
  const [currentSpace, setCurrentSpace] = useState<(Space & { role: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  // Load user profile and spaces data
  const loadUserData = async (userId: string) => {
    const supabase = createClient();

    try {
      console.log('🔄 Loading user data for:', userId);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
      } else if (profile) {
        console.log('✅ Profile loaded:', profile);
        setUser({
          id: profile.id,
          email: profile.email || '',
          name: profile.full_name || profile.email || '',
          pronouns: profile.pronouns,
          color_theme: profile.color_theme || 'light',
          avatar_url: profile.avatar_url,
        });
      } else {
        console.log('⚠️ No profile found for user');
      }

      // Get user spaces
      const { data: spacesData, error: spacesError } = await supabase
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

      if (spacesError) {
        console.error('❌ Spaces error:', spacesError);
      } else if (spacesData) {
        console.log('✅ Spaces loaded:', spacesData);
        const userSpaces = spacesData.map((item: any) => ({
          ...item.spaces,
          role: item.role,
        }));
        setSpaces(userSpaces);

        // Set first space as current if available
        if (userSpaces.length > 0) {
          setCurrentSpace(userSpaces[0]);
          console.log('✅ Current space set:', userSpaces[0]);
        } else {
          console.log('⚠️ User has no spaces - continuing without space');
          // Don't hang - just continue without a space
        }
      } else {
        console.log('⚠️ No spaces data returned');
      }
    } catch (error) {
      console.error('💥 Failed to load user data:', error);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadUserData(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true); // Set loading while processing auth change
      setSession(session);
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        // Clear user data on logout
        setUser(null);
        setSpaces([]);
        setCurrentSpace(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simple stub functions for now
  const signUp = async (email: string, password: string, profile: any) => {
    return { error: new Error('SignUp not implemented yet') };
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
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSpaces([]);
    setCurrentSpace(null);
  };

  const switchSpace = (space: Space & { role: string }) => {
    setCurrentSpace(space);
  };

  const refreshSpaces = async () => {
    if (session?.user) {
      await loadUserData(session.user.id);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadUserData(session.user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    spaces,
    currentSpace,
    loading,
    signUp,
    signIn,
    signOut,
    switchSpace,
    refreshSpaces,
    refreshProfile,
  };

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