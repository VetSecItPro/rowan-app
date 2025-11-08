'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Space } from '@/lib/types';
import { ensureUserHasSpace } from '@/lib/services/space-auto-creation-service';

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
  ensureCurrentUserHasSpace: () => Promise<{ success: boolean; spaceId?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [spaces, setSpaces] = useState<(Space & { role: string })[]>([]);
  const [currentSpace, setCurrentSpace] = useState<(Space & { role: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  // Load user profile and spaces data with bulletproof error handling
  const loadUserData = async (userId: string) => {
    console.log('🔄 Loading user data for:', userId);

    // Always set a fallback user immediately to prevent hanging
    const fallbackUser = {
      id: userId,
      email: 'user@example.com',
      name: 'User',
      color_theme: 'light',
    };

    try {
      const supabase = createClient();
      console.log('📡 Supabase client created');

      // Wrap queries in timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      );

      // Get user profile with timeout protection
      console.log('📋 Fetching user profile...');
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const profileResult = await Promise.race([profilePromise, timeoutPromise]);
      const { data: profile, error: profileError } = profileResult as any;

      if (profileError) {
        console.error('❌ Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        console.log('🔄 Setting fallback user due to profile error');
        setUser(fallbackUser);
      } else if (profile) {
        console.log('✅ Profile loaded successfully:', profile);
        setUser({
          id: profile.id,
          email: profile.email || fallbackUser.email,
          name: profile.name || profile.email || fallbackUser.name,
          pronouns: profile.pronouns,
          color_theme: profile.color_theme || 'light',
          avatar_url: profile.avatar_url,
        });
      } else {
        console.log('⚠️ No profile found - creating fallback user');
        setUser(fallbackUser);
      }

      // Get user spaces with timeout protection
      console.log('🏠 Fetching user spaces...');
      const spacesPromise = supabase
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

      try {
        const spacesResult = await Promise.race([spacesPromise, timeoutPromise]);
        const { data: spacesData, error: spacesError } = spacesResult as any;

        if (spacesError) {
          console.error('❌ Spaces error details:', {
            code: spacesError.code,
            message: spacesError.message,
            details: spacesError.details,
            hint: spacesError.hint
          });
          setSpaces([]);
          setCurrentSpace(null);
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
      } catch (spacesError) {
        console.error('❌ Spaces query failed or timeout:', spacesError);
        setSpaces([]);
        setCurrentSpace(null);
      }

      console.log('✅ User data loading completed successfully');

    } catch (error) {
      console.error('💥 Unexpected error in loadUserData:', error);
      console.log('🔄 Setting fallback user due to unexpected error');
      // Always set user data to prevent infinite loading
      setUser(fallbackUser);
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
    try {
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
        return { error: new Error(data.error || data.details || 'Signup failed') };
      }

      return { error: null };
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

  const ensureCurrentUserHasSpace = async () => {
    try {
      const result = await ensureUserHasSpace();

      if (result.success && result.spaceId) {
        // Refresh spaces to update context with new space
        await refreshSpaces();
        return result;
      }

      return result;
    } catch (error) {
      console.error('[auth-context] Error ensuring user has space:', error);
      return {
        success: false,
        error: 'Failed to ensure user has space'
      };
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
    ensureCurrentUserHasSpace,
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