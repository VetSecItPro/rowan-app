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
    console.log('🔄 Loading user data for:', userId);

    try {
      const supabase = createClient();
      console.log('📡 Supabase client created');

      // Get user profile with more detailed error handling
      console.log('📋 Fetching user profile...');
      const profileQuery = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: profile, error: profileError } = await profileQuery;

      if (profileError) {
        console.error('❌ Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        // Continue anyway - create minimal user object
        setUser({
          id: userId,
          email: 'unknown@example.com',
          name: 'User',
          color_theme: 'light',
        });
      } else if (profile) {
        console.log('✅ Profile loaded successfully:', profile);
        setUser({
          id: profile.id,
          email: profile.email || '',
          name: profile.name || profile.email || 'User',
          pronouns: profile.pronouns,
          color_theme: profile.color_theme || 'light',
          avatar_url: profile.avatar_url,
        });
      } else {
        console.log('⚠️ No profile found - creating minimal user');
        setUser({
          id: userId,
          email: 'unknown@example.com',
          name: 'User',
          color_theme: 'light',
        });
      }

      // Get user spaces with detailed error handling
      console.log('🏠 Fetching user spaces...');
      const spacesQuery = supabase
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

      const { data: spacesData, error: spacesError } = await spacesQuery;

      if (spacesError) {
        console.error('❌ Spaces error details:', {
          code: spacesError.code,
          message: spacesError.message,
          details: spacesError.details,
          hint: spacesError.hint
        });
        // Continue with empty spaces array
        setSpaces([]);
      } else if (spacesData && spacesData.length > 0) {
        console.log('✅ Spaces loaded successfully:', spacesData);
        const userSpaces = spacesData.map((item: any) => ({
          ...item.spaces,
          role: item.role,
        }));
        setSpaces(userSpaces);
        setCurrentSpace(userSpaces[0]);
        console.log('✅ Current space set:', userSpaces[0]);
      } else {
        console.log('⚠️ User has no spaces - continuing without space');
        setSpaces([]);
        setCurrentSpace(null);
      }

      console.log('✅ User data loading completed successfully');

    } catch (error) {
      console.error('💥 Unexpected error in loadUserData:', error);
      // Set minimal user data to prevent infinite loading
      setUser({
        id: userId,
        email: 'error@example.com',
        name: 'User',
        color_theme: 'light',
      });
      setSpaces([]);
      setCurrentSpace(null);
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