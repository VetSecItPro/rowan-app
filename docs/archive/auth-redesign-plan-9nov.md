# 🏗️ AUTHENTICATION ARCHITECTURE COMPLETE REDESIGN PLAN
## Date: November 9, 2025 | Status: In Progress

---

## 🚨 **EXECUTIVE SUMMARY**

**Problem:** Rowan app authentication system is fundamentally broken due to race conditions, poor state management, and inability to handle zero-spaces scenarios. Users experience perpetual loading screens, login failures, and broken feature access.

**Solution:** Complete architectural redesign with clean separation between authentication and space management, proper loading states, and first-class zero-spaces handling.

**Status:** Root cause identified through SQL diagnostics. Ready for implementation.

---

## 📋 **INVESTIGATION FINDINGS**

### **SQL Diagnostic Results (Completed)**

**Database Health Check:**
- ✅ Authentication working (auth.uid() functions)
- ✅ RLS policies properly configured
- ✅ Database queries execute successfully
- 🚨 **CRITICAL FINDING:** User has ZERO spaces in database

**Diagnostic Query Results:**
```sql
-- DIAGNOSTIC 1: User authentication ✅ WORKING
SELECT id, email FROM auth.users WHERE id = auth.uid();
-- Result: Valid user found

-- DIAGNOSTIC 2: Space membership ❌ ZERO RESULTS
SELECT * FROM space_members WHERE user_id = auth.uid();
-- Result: "Success. No rows returned"

-- DIAGNOSTIC 3: Direct spaces query ❌ ZERO RESULTS
SELECT role, spaces.* FROM space_members LEFT JOIN spaces...
-- Result: "Success. No rows returned"

-- DIAGNOSTIC 4: RLS policies ✅ PROPERLY CONFIGURED
SELECT * FROM pg_policies WHERE tablename IN ('space_members', 'spaces');
-- Result: All required policies present and correct

-- DIAGNOSTIC 5: Total spaces count ❌ ZERO SPACES
SELECT COUNT(*) as total_spaces FROM space_members sm...
-- Result: total_spaces: 0, space_names: NULL, user_roles: NULL
```

### **Root Cause Analysis**

**Primary Issue:** User has no spaces in database, but system treats this as "loading" state
**Secondary Issue:** Race condition in auth context loading sequence
**Tertiary Issue:** No distinction between "loading" vs "no spaces" states

**Current Broken Flow:**
```
1. User logs in ✅
2. Auth context loads session ✅
3. Auth context queries spaces ✅
4. Query returns empty array [] ✅
5. setSpaces([]) ✅
6. setCurrentSpace(null) ✅
7. setLoading(false) ✅ (WRONG - should indicate "no spaces found")
8. Pages check: if (!currentSpace) ❌
9. Shows "Please wait while loading your space..." ❌
10. But loading=false, so infinite wait ❌
```

---

## 🏗️ **NEW ARCHITECTURE DESIGN**

### **Current Broken Architecture**
```
AuthContext (OVERLOADED & BROKEN)
├── Session Management (working)
├── User Profile Loading (working)
├── Spaces Loading (WRONG PLACE - causes coupling)
├── Current Space Selection (WRONG PLACE - causes coupling)
├── Complex Loading State (RACE CONDITIONS)
└── Silent Error Handling (POOR UX)
```

### **New Clean Architecture**
```
AuthContext (FOCUSED & RELIABLE)
├── Session Management ✅
├── User Profile Loading ✅
├── Clear Auth States (CHECKING_SESSION, AUTHENTICATED, UNAUTHENTICATED) ✅
└── Proper Error Handling ✅

SpacesContext (SEPARATED & ROBUST)
├── Spaces Loading ✅
├── Current Space Selection ✅
├── Clear Space States (LOADING_SPACES, HAS_SPACES, NO_SPACES, ERROR) ✅
├── Zero-Spaces Handling ✅
└── Retry Mechanisms ✅

App States (COMBINED LOGIC)
├── NEEDS_LOGIN → Redirect to /login
├── NEEDS_FIRST_SPACE → Show "Create your first space" UI
├── LOADING_APP_DATA → Show proper loading UI
├── READY_TO_USE → Show normal application
└── ERROR_OCCURRED → Show error with retry options
```

### **State Management Strategy**

**Authentication States:**
```typescript
type AuthState =
  | { status: 'CHECKING_SESSION'; user: null; session: null }
  | { status: 'AUTHENTICATED'; user: UserProfile; session: Session }
  | { status: 'UNAUTHENTICATED'; user: null; session: null }
  | { status: 'ERROR'; user: null; session: null; error: string }
```

**Spaces States:**
```typescript
type SpacesState =
  | { status: 'LOADING_SPACES'; spaces: []; currentSpace: null }
  | { status: 'HAS_SPACES'; spaces: Space[]; currentSpace: Space }
  | { status: 'NO_SPACES'; spaces: []; currentSpace: null }
  | { status: 'ERROR'; spaces: []; currentSpace: null; error: string }
```

**Combined App States:**
```typescript
type AppState =
  | 'NEEDS_LOGIN'        // No session → redirect to login
  | 'NEEDS_FIRST_SPACE'  // Authenticated but no spaces → onboarding flow
  | 'LOADING_APP_DATA'   // Auth complete, spaces loading → loading UI
  | 'READY_TO_USE'       // Auth + spaces ready → normal app
  | 'ERROR_OCCURRED'     // Something failed → error UI with retry
```

---

## 📁 **FILES TO BE MODIFIED**

### **Core Architecture Files (New/Rewrite)**
1. **`lib/contexts/auth-context.tsx`** - COMPLETE REWRITE
   - Focus: Session + profile only
   - Remove spaces logic entirely
   - Add proper loading states and error handling

2. **`lib/contexts/spaces-context.tsx`** - NEW FILE
   - Focus: Spaces + currentSpace only
   - Handle zero-spaces as valid state
   - Add retry mechanisms and proper error handling

3. **`lib/hooks/useAuthWithSpaces.tsx`** - NEW FILE
   - Convenience hook combining both contexts
   - Provides combined app state logic
   - Handles loading sequence coordination

4. **`components/ui/LoadingStates.tsx`** - NEW FILE
   - AuthLoading, SpacesLoading, AppLoading components
   - Consistent loading UI across app

5. **`components/ui/ErrorStates.tsx`** - NEW FILE
   - AuthError, SpacesError, NoSpaces components
   - Consistent error handling UI

6. **`components/ui/FirstSpaceOnboarding.tsx`** - NEW FILE
   - UI for users with zero spaces
   - "Create your first space" workflow

### **Application Structure Files (Update)**
7. **`app/layout.tsx`** - UPDATE PROVIDERS
   - Wrap with AuthProvider and SpacesProvider
   - Proper nesting order (Auth → Spaces → App)

8. **`middleware.ts`** - SIMPLIFY
   - Only check for session, not spaces
   - Redirect logic: no session → /login, otherwise continue

### **All Main Pages (Standardized Pattern)**
9. **`app/(main)/dashboard/page.tsx`** - UPDATE
10. **`app/(main)/meals/page.tsx`** - UPDATE
11. **`app/(main)/tasks/page.tsx`** - UPDATE
12. **`app/(main)/goals/page.tsx`** - UPDATE
13. **`app/(main)/calendar/page.tsx`** - UPDATE
14. **`app/(main)/shopping/page.tsx`** - UPDATE
15. **`app/(main)/reminders/page.tsx`** - UPDATE
16. **`app/(main)/messages/page.tsx`** - UPDATE
17. **`app/(main)/projects/page.tsx`** - UPDATE

### **Component Files (Update)**
18. **`components/layout/Header.tsx`** - UPDATE
    - Use separate auth and spaces contexts
    - Show appropriate UI for each state

19. **All Modal Components** - UPDATE
    - Use spaces context for spaceId
    - Handle loading/error gracefully

### **Service Layer (New)**
20. **`lib/services/spaces-service.ts`** - NEW FILE
    - Centralized space operations
    - Create space, join space, leave space functions

---

## 🔄 **DETAILED IMPLEMENTATION STEPS**

### **PHASE 1: Foundation Setup**

#### **Step 1.1: Create New LoadingStates Component**
**File:** `components/ui/LoadingStates.tsx`
```typescript
export function AuthLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Checking your authentication...</p>
      </div>
    </div>
  );
}

export function SpacesLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading your spaces...</p>
      </div>
    </div>
  );
}

export function AppLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Setting up your workspace...</p>
      </div>
    </div>
  );
}
```

#### **Step 1.2: Create ErrorStates Component**
**File:** `components/ui/ErrorStates.tsx`
```typescript
interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
}

export function ErrorState({ title, message, onRetry, onSecondaryAction, secondaryActionText }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          )}
          {onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Authentication Error"
      message={`We couldn't log you in. ${error}`}
      onRetry={onRetry}
      onSecondaryAction={() => window.location.href = '/login'}
      secondaryActionText="Go to Login"
    />
  );
}

export function SpacesErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Couldn't Load Your Spaces"
      message={`We had trouble loading your workspaces. ${error}`}
      onRetry={onRetry}
      onSecondaryAction={() => window.location.reload()}
      secondaryActionText="Refresh Page"
    />
  );
}
```

#### **Step 1.3: Create FirstSpaceOnboarding Component**
**File:** `components/ui/FirstSpaceOnboarding.tsx`
```typescript
interface FirstSpaceOnboardingProps {
  onCreateSpace: (spaceName: string) => Promise<void>;
  loading?: boolean;
}

export function FirstSpaceOnboarding({ onCreateSpace, loading = false }: FirstSpaceOnboardingProps) {
  const [spaceName, setSpaceName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (spaceName.trim()) {
      await onCreateSpace(spaceName.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Rowan!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Let's create your first workspace to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="spaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                id="spaceName"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="e.g., My Family, Work Team, Personal"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!spaceName.trim() || loading}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Creating Workspace...
                </div>
              ) : (
                'Create My First Workspace'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You can create additional workspaces later in settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **PHASE 2: Core Context Redesign**

#### **Step 2.1: Create New AuthContext (Session + Profile Only)**
**File:** `lib/contexts/auth-context.tsx`
```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  pronouns?: string;
  color_theme: string;
  avatar_url?: string;
}

type AuthState =
  | { status: 'CHECKING_SESSION'; user: null; session: null; error: null }
  | { status: 'AUTHENTICATED'; user: UserProfile; session: Session; error: null }
  | { status: 'UNAUTHENTICATED'; user: null; session: null; error: null }
  | { status: 'ERROR'; user: null; session: null; error: string };

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, profile: any) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'CHECKING_SESSION',
    user: null,
    session: null,
    error: null,
  });

  // Load user profile (separate from spaces)
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = createClient();
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile loading error:', profileError);
        // Return basic profile if database profile missing
        return {
          id: userId,
          email: '',
          name: 'User',
          pronouns: undefined,
          color_theme: 'light',
          avatar_url: undefined,
        };
      }

      return {
        id: profile.id,
        email: profile.email || '',
        name: profile.name || profile.email || 'User',
        pronouns: profile.pronouns,
        color_theme: profile.color_theme || 'light',
        avatar_url: profile.avatar_url,
      };
    } catch (error) {
      console.error('User profile loading failed:', error);
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const supabase = createClient();

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          // Load user profile
          const userProfile = await loadUserProfile(session.user.id);

          if (userProfile) {
            setAuthState({
              status: 'AUTHENTICATED',
              user: userProfile,
              session,
              error: null,
            });
          } else {
            setAuthState({
              status: 'ERROR',
              user: null,
              session: null,
              error: 'Failed to load user profile',
            });
          }
        } else {
          setAuthState({
            status: 'UNAUTHENTICATED',
            user: null,
            session: null,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setAuthState({
          status: 'ERROR',
          user: null,
          session: null,
          error: 'Authentication system error',
        });
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const userProfile = await loadUserProfile(session.user.id);

          if (userProfile) {
            setAuthState({
              status: 'AUTHENTICATED',
              user: userProfile,
              session,
              error: null,
            });
          } else {
            setAuthState({
              status: 'ERROR',
              user: null,
              session: null,
              error: 'Failed to load user profile',
            });
          }
        } else {
          setAuthState({
            status: 'UNAUTHENTICATED',
            user: null,
            session: null,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth state change failed:', error);
        setAuthState({
          status: 'ERROR',
          user: null,
          session: null,
          error: 'Authentication error occurred',
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, profile: any) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile }),
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setAuthState({
        status: 'UNAUTHENTICATED',
        user: null,
        session: null,
        error: null,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (authState.status === 'AUTHENTICATED' && authState.session) {
      const userProfile = await loadUserProfile(authState.session.user.id);
      if (userProfile) {
        setAuthState({
          ...authState,
          user: userProfile,
        });
      }
    }
  };

  const retry = () => {
    setAuthState({
      status: 'CHECKING_SESSION',
      user: null,
      session: null,
      error: null,
    });
    // Re-run the initialization
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      retry,
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
```

#### **Step 2.2: Create New SpacesContext (Spaces + CurrentSpace Only)**
**File:** `lib/contexts/spaces-context.tsx`
```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-context';
import type { Space } from '@/lib/types';

type SpacesState =
  | { status: 'LOADING_SPACES'; spaces: []; currentSpace: null; error: null }
  | { status: 'HAS_SPACES'; spaces: (Space & { role: string })[]; currentSpace: Space & { role: string }; error: null }
  | { status: 'NO_SPACES'; spaces: []; currentSpace: null; error: null }
  | { status: 'ERROR'; spaces: []; currentSpace: null; error: string };

interface SpacesContextType extends SpacesState {
  switchSpace: (space: Space & { role: string }) => void;
  refreshSpaces: () => Promise<void>;
  createFirstSpace: (spaceName: string) => Promise<void>;
  retry: () => void;
}

const SpacesContext = createContext<SpacesContextType | null>(null);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [spacesState, setSpacesState] = useState<SpacesState>({
    status: 'LOADING_SPACES',
    spaces: [],
    currentSpace: null,
    error: null,
  });

  // Load user spaces
  const loadSpaces = async (userId: string): Promise<void> => {
    try {
      setSpacesState({
        status: 'LOADING_SPACES',
        spaces: [],
        currentSpace: null,
        error: null,
      });

      const supabase = createClient();
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
        throw spacesError;
      }

      if (spacesData && spacesData.length > 0) {
        const userSpaces = spacesData.map((item: any) => ({
          ...item.spaces,
          role: item.role,
        }));

        setSpacesState({
          status: 'HAS_SPACES',
          spaces: userSpaces,
          currentSpace: userSpaces[0],
          error: null,
        });
      } else {
        // Zero spaces is a valid state, not an error
        setSpacesState({
          status: 'NO_SPACES',
          spaces: [],
          currentSpace: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Spaces loading failed:', error);
      setSpacesState({
        status: 'ERROR',
        spaces: [],
        currentSpace: null,
        error: 'Failed to load your workspaces',
      });
    }
  };

  // Load spaces when user authenticates
  useEffect(() => {
    if (auth.status === 'AUTHENTICATED') {
      loadSpaces(auth.user.id);
    } else if (auth.status === 'UNAUTHENTICATED') {
      // Reset spaces when user logs out
      setSpacesState({
        status: 'LOADING_SPACES',
        spaces: [],
        currentSpace: null,
        error: null,
      });
    }
  }, [auth.status, auth.user?.id]);

  const switchSpace = (space: Space & { role: string }) => {
    if (spacesState.status === 'HAS_SPACES') {
      setSpacesState({
        ...spacesState,
        currentSpace: space,
      });
    }
  };

  const refreshSpaces = async () => {
    if (auth.status === 'AUTHENTICATED') {
      await loadSpaces(auth.user.id);
    }
  };

  const createFirstSpace = async (spaceName: string) => {
    if (auth.status !== 'AUTHENTICATED') return;

    try {
      const supabase = createClient();

      // Create new space
      const { data: newSpace, error: createError } = await supabase
        .from('spaces')
        .insert({
          name: spaceName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          user_id: auth.user.id,
          space_id: newSpace.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Refresh spaces to show the new one
      await refreshSpaces();
    } catch (error) {
      console.error('Failed to create first space:', error);
      setSpacesState({
        status: 'ERROR',
        spaces: [],
        currentSpace: null,
        error: 'Failed to create workspace',
      });
    }
  };

  const retry = () => {
    if (auth.status === 'AUTHENTICATED') {
      loadSpaces(auth.user.id);
    }
  };

  return (
    <SpacesContext.Provider value={{
      ...spacesState,
      switchSpace,
      refreshSpaces,
      createFirstSpace,
      retry,
    }}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error('useSpaces must be used within SpacesProvider');
  }
  return context;
}
```

#### **Step 2.3: Create Combined Hook**
**File:** `lib/hooks/useAuthWithSpaces.tsx`
```typescript
import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';

export type AppState =
  | 'NEEDS_LOGIN'        // No session → redirect to login
  | 'NEEDS_FIRST_SPACE'  // Authenticated but no spaces → onboarding flow
  | 'LOADING_APP_DATA'   // Auth complete, spaces loading → loading UI
  | 'READY_TO_USE'       // Auth + spaces ready → normal app
  | 'ERROR_OCCURRED';    // Something failed → error UI with retry

export function useAuthWithSpaces() {
  const auth = useAuth();
  const spaces = useSpaces();

  // Determine overall app state
  const getAppState = (): AppState => {
    // Handle auth states first
    if (auth.status === 'CHECKING_SESSION') return 'LOADING_APP_DATA';
    if (auth.status === 'UNAUTHENTICATED') return 'NEEDS_LOGIN';
    if (auth.status === 'ERROR') return 'ERROR_OCCURRED';

    // User is authenticated, check spaces
    if (auth.status === 'AUTHENTICATED') {
      if (spaces.status === 'LOADING_SPACES') return 'LOADING_APP_DATA';
      if (spaces.status === 'NO_SPACES') return 'NEEDS_FIRST_SPACE';
      if (spaces.status === 'ERROR') return 'ERROR_OCCURRED';
      if (spaces.status === 'HAS_SPACES') return 'READY_TO_USE';
    }

    return 'LOADING_APP_DATA';
  };

  const appState = getAppState();

  return {
    auth,
    spaces,
    appState,

    // Convenience getters
    isLoading: appState === 'LOADING_APP_DATA',
    needsLogin: appState === 'NEEDS_LOGIN',
    needsFirstSpace: appState === 'NEEDS_FIRST_SPACE',
    isReady: appState === 'READY_TO_USE',
    hasError: appState === 'ERROR_OCCURRED',

    // Combined error message
    errorMessage: auth.error || spaces.error,

    // Combined retry function
    retry: () => {
      if (auth.error) auth.retry();
      if (spaces.error) spaces.retry();
    },
  };
}
```

### **PHASE 3: Application Structure Updates**

#### **Step 3.1: Update Root Layout**
**File:** `app/layout.tsx`
```typescript
import { AuthProvider } from '@/lib/contexts/auth-context';
import { SpacesProvider } from '@/lib/contexts/spaces-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AuthProvider>
          <SpacesProvider>
            {children}
          </SpacesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### **Step 3.2: Update Middleware**
**File:** `middleware.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Only check for session, not spaces
  // Let the frontend handle space loading and onboarding
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!session && request.nextUrl.pathname.startsWith('/(main)')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### **PHASE 4: Page Pattern Standardization**

#### **Step 4.1: Create Standard Page Pattern**
**All pages will follow this pattern:**

```typescript
'use client';

import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { AuthLoadingState, SpacesLoadingState, AppLoadingState } from '@/components/ui/LoadingStates';
import { AuthErrorState, SpacesErrorState } from '@/components/ui/ErrorStates';
import { FirstSpaceOnboarding } from '@/components/ui/FirstSpaceOnboarding';

export default function PageName() {
  const { auth, spaces, appState, errorMessage, retry } = useAuthWithSpaces();

  // Handle different app states
  switch (appState) {
    case 'NEEDS_LOGIN':
      // Middleware should handle this, but just in case
      window.location.href = '/login';
      return <AuthLoadingState />;

    case 'LOADING_APP_DATA':
      if (auth.status === 'CHECKING_SESSION') {
        return <AuthLoadingState />;
      }
      if (spaces.status === 'LOADING_SPACES') {
        return <SpacesLoadingState />;
      }
      return <AppLoadingState />;

    case 'ERROR_OCCURRED':
      if (auth.error) {
        return <AuthErrorState error={auth.error} onRetry={auth.retry} />;
      }
      if (spaces.error) {
        return <SpacesErrorState error={spaces.error} onRetry={spaces.retry} />;
      }
      return <div>Unknown error occurred</div>;

    case 'NEEDS_FIRST_SPACE':
      return <FirstSpaceOnboarding onCreateSpace={spaces.createFirstSpace} />;

    case 'READY_TO_USE':
      // Normal page content here
      return <ActualPageContent />;

    default:
      return <AppLoadingState />;
  }
}

function ActualPageContent() {
  const { spaces } = useAuthWithSpaces();

  // At this point, we're guaranteed to have:
  // - auth.status === 'AUTHENTICATED'
  // - spaces.status === 'HAS_SPACES'
  // - spaces.currentSpace is available

  return (
    <div>
      {/* Your actual page content */}
      <h1>Welcome to {spaces.currentSpace.name}</h1>
      {/* Rest of page */}
    </div>
  );
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation ✅**
- [x] Create LoadingStates.tsx component
- [x] Create ErrorStates.tsx component
- [x] Create FirstSpaceOnboarding.tsx component

### **Phase 2: Core Contexts ⏳**
- [ ] Implement new AuthContext (session + profile only)
- [ ] Implement new SpacesContext (spaces + currentSpace only)
- [ ] Create useAuthWithSpaces hook
- [ ] Test context integration

### **Phase 3: App Structure ⏳**
- [ ] Update app/layout.tsx with new providers
- [ ] Update middleware.ts for session-only checks
- [ ] Test provider nesting and initialization

### **Phase 4: Page Updates ⏳**
- [ ] Update dashboard/page.tsx with new pattern
- [ ] Update meals/page.tsx with new pattern
- [ ] Update tasks/page.tsx with new pattern
- [ ] Update goals/page.tsx with new pattern
- [ ] Update calendar/page.tsx with new pattern
- [ ] Update shopping/page.tsx with new pattern
- [ ] Update reminders/page.tsx with new pattern
- [ ] Update messages/page.tsx with new pattern
- [ ] Update projects/page.tsx with new pattern

### **Phase 5: Component Updates ⏳**
- [ ] Update Header.tsx for new contexts
- [ ] Update modal components for spaceId handling
- [ ] Test component integration

### **Phase 6: Testing & Validation ⏳**
- [ ] Test authentication flow end-to-end
- [ ] Test zero-spaces onboarding flow
- [ ] Test space creation and switching
- [ ] Test error scenarios and recovery
- [ ] Test loading states and transitions
- [ ] Verify all pages work correctly

---

## 🧪 **TESTING SCENARIOS**

### **Authentication Testing**
1. **Fresh User (No Spaces)** ✅ IDENTIFIED
   - Login → Should show FirstSpaceOnboarding
   - Create space → Should redirect to dashboard
   - Verify space creation in database

2. **Existing User (With Spaces)**
   - Login → Should load spaces and redirect to dashboard
   - Space switching → Should update currentSpace
   - Logout → Should clear all state

3. **Error Scenarios**
   - Network timeout → Should show retry option
   - Database error → Should show error message
   - Invalid session → Should redirect to login

### **Loading State Testing**
1. **Slow Network Simulation**
   - Auth loading → Show "Checking authentication"
   - Spaces loading → Show "Loading your spaces"
   - Combined loading → Show appropriate state

2. **Fast Network**
   - Verify no flash of loading states
   - Smooth transitions between states

### **Zero-Spaces Testing**
1. **First-Time User**
   - Show onboarding immediately
   - Create space successfully
   - Redirect to dashboard with new space

2. **User Loses Access**
   - If removed from all spaces
   - Should show "no spaces" state
   - Allow creating new space

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Development Testing**
1. Test with current user (no spaces) ✅
2. Create test space for user ✅
3. Test full flow with spaces
4. Verify error handling

### **Staging Deployment**
1. Deploy auth changes
2. Test with multiple users
3. Verify space creation flow
4. Load testing

### **Production Deployment**
1. Feature flag new auth system
2. Gradual rollout to users
3. Monitor error rates
4. Full deployment

---

## 📊 **CURRENT STATUS**

**Date:** November 9, 2025
**Phase:** Foundation Setup ⏳
**Next Step:** Implement new AuthContext
**Blocking Issues:** None
**Ready for Implementation:** ✅ YES

**Last Updated:** Initial comprehensive plan created
**Next Update:** After Phase 1 completion

---

## 🔄 **SESSION RECOVERY INSTRUCTIONS**

If this session crashes, resume from:

1. **Current Phase:** Foundation Setup
2. **Next File:** `components/ui/LoadingStates.tsx`
3. **Context:** User has zero spaces, auth redesign in progress
4. **SQL Diagnostics:** Completed - user has valid auth but no spaces
5. **Architecture Decisions:** Made - clean separation of auth and spaces

**Key Commands to Run:**
```bash
cd /Users/airborneshellback/Documents/16. Vibe Code Projects/rowan-app
npm run dev
# App should be running on localhost:3000
```

**Key Context:**
- Authentication works, user has no spaces in database
- Root cause identified: race condition + zero-spaces not handled
- Full architectural redesign in progress
- All design decisions documented in this file

---

**END OF DOCUMENT**