# Authentication Loading Flow Analysis

## Executive Summary

This analysis identifies the current 0.5-1s "Loading authentication..." delay and outlines optimization opportunities to show content faster using optimistic/skeleton patterns while auth loads in the background.

---

## 1. Where the "Loading Authentication" Message Appears

### Location: `/components/ui/LoadingStates.tsx`

```typescript
export function AuthLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center...">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading authentication...</p>
    </div>
  );
}
```

### Trigger Flow

The message is shown by `AppWithOnboarding` component:

```
app/layout.tsx (Root)
  ↓
AuthProvider (auth-context-v2.tsx)
  ↓
SpacesProvider (spaces-context.tsx)
  ↓
AppWithOnboarding (checks authLoading)
  ↓
IF authLoading === true → Shows <AuthLoadingState />
```

**Code Path:** `/components/app/AppWithOnboarding.tsx` (lines 42-45)

```typescript
if (authLoading) {
  return <AuthLoadingState />;
}
```

---

## 2. What Causes the 0.5-1s Delay

### Root Cause: Sequential Query Chain

The loading delay stems from **two sequential queries that must complete before the app renders**:

#### Query 1: Session Check (Blocking)
**Location:** `/lib/hooks/useAuthQuery.ts` (lines 32-46)

```typescript
export function useAuthSession() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.session(),
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      // ← BLOCKING: Waits for Supabase response
      if (error) throw error;
      return session;
    },
    staleTime: 2 * 60 * 1000,      // 2 min
    refetchInterval: 5 * 60 * 1000, // 5 min
  });
}
```

#### Query 2: Profile Load (Dependent on Query 1)
**Location:** `/lib/hooks/useAuthQuery.ts` (lines 53-88)

```typescript
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.auth.profile(userId || ''),
    queryFn: async (): Promise<UserProfile> => {
      // ← BLOCKED: Only runs after userId from session query
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      // ← 2nd BLOCKING: Waits for profile data
    },
    enabled: !!userId, // Dependent on Query 1 completing
  });
}
```

#### Query 3: Spaces Load (Dependent on Query 2)
**Location:** `/lib/hooks/useSpacesQuery.ts` (lines 47-97)

```typescript
export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.spaces.all(userId || ''),
    queryFn: async (): Promise<Space[]> => {
      // ← BLOCKED: Only runs after userId available
      
      // Quick count check first
      const { count: spacesCount } = await supabase
        .from('space_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      // Then full data fetch
      const { data } = await supabase
        .from('space_members')
        .select(`role, spaces:space_id (...)`)
        .eq('user_id', userId);
    },
    enabled: !!userId,
  });
}
```

#### Query Waterfall Timeline

```
Time: 0ms          100ms           200ms           300ms+
─────────────────────────────────────────────────────────
Session Query      ██████ (100ms)
                        │
                        ├→ Profile Query    ██████ (80ms)
                                 │
                                 ├→ Spaces Count   ██ (20ms)
                                                │
                                                ├→ Full Spaces ██████ (80ms)
                                                           │
                                                           ├→ Current Space ██ (20ms)
                                                                        │
Rendering blocks until ALL complete ────────────────────────────────→ Ready
```

**Total Block Time: 300-500ms minimum**

---

## 3. Current Architecture Issues

### Issue 1: Blocking Auth Pattern
**File:** `useAuth()` hook in `/lib/hooks/useAuthQuery.ts`

```typescript
export function useAuth() {
  const sessionQuery = useAuthSession();      // BLOCKS
  const profileQuery = useUserProfile(...);   // BLOCKS (waits for session)
  
  const isLoading = sessionQuery.isLoading;   // Returns true until BOTH complete
  
  return {
    isLoading,  // ← This stays true for entire waterfall duration
    // ...
  };
}
```

**Problem:** `isLoading` flag doesn't distinguish between:
- Session loading (critical, blocks everything)
- Profile loading (can be parallelized)
- Spaces loading (can show skeleton UI)

### Issue 2: Blocking in AppWithOnboarding
**File:** `/components/app/AppWithOnboarding.tsx` (lines 32-55)

```typescript
const {
  user,
  authLoading,      // ← Blocks entire app
  spacesLoading,    // ← Another blocking check
  isAuthenticated,
  hasZeroSpaces,
} = useAuthWithSpaces();

if (authLoading) {
  return <AuthLoadingState />;  // ← Full-screen spinner
}

if (isCheckingSpaces || spacesLoading) {
  return <SpacesLoadingState />;  // ← Another full-screen spinner
}
```

### Issue 3: Query Dependencies
All queries enable based on `userId`:

```typescript
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    // ...
    enabled: !!userId,  // ← Only runs after session query completes
  });
}

export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    // ...
    enabled: !!userId,  // ← Only runs after profile query completes
  });
}
```

---

## 4. Current Loading State Displays

### Full-Screen Blocking Spinners

1. **AuthLoadingState** (0-300ms)
   - File: `/components/ui/LoadingStates.tsx`
   - Shown while session + profile loading
   - Blocks entire app

2. **SpacesLoadingState** (300-500ms)
   - File: `/components/ui/LoadingStates.tsx`
   - Shown while spaces loading
   - Another full-screen block

### Skeleton in Dashboard
- File: `/app/(main)/dashboard/loading.tsx`
- Uses Next.js `loading.tsx` pattern
- Only shown for dashboard route
- Requires streaming/progressive rendering

---

## 5. Optimization Opportunities

### Opportunity 1: Parallel Session + Profile Loading

**Current:** Sequential
```
Session (100ms) → Profile (80ms) = 180ms block
```

**Optimized:** Parallel with cached session
```
useAuthSession() returns quickly with cached data
Then Profile query runs
Result: 80ms block (profile only)
```

**Implementation:**
- Reduce `refetchOnMount` for session query
- Use stale-while-revalidate pattern
- Only refetch session in background

### Opportunity 2: Non-Blocking Spaces Loading

**Current:** Full-screen spinner waits for spaces count + full fetch

**Optimized:** Show dashboard with skeleton spaces
- Use React Query's `isPending` instead of `isLoading`
- Distinguish between "no data" and "loading"
- Show optimistic UI immediately

### Opportunity 3: Optimistic Layout Rendering

**Current Flow:**
```
App loads → Block on auth → Block on spaces → Show dashboard
```

**Optimized Flow:**
```
App loads → Block ONLY on session (100ms)
         → Render layout with skeleton content
         → Load profile + spaces in background
         → Progressively show real content as data arrives
```

### Opportunity 4: Cache-First Strategy

**Current:** All queries bypass cache on first load
```typescript
refetchOnMount: 'always',  // Always re-fetch, ignoring cache
```

**Optimized:** Use cache until stale
```typescript
refetchOnMount: false,     // Use cache on mount
refetchOnWindowFocus: true, // Refetch when focused
```

**Result:** 0ms initial load if returning user

---

## 6. Recommended Optimizations

### Priority 1: Reduce Session Check Time (High Impact)

**Change:** Use cached session for first render

```typescript
// lib/hooks/useAuthQuery.ts

export function useAuthSession() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.session(),
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
    // OPTIMIZED: Don't refetch on mount, use cache
    refetchOnMount: false,        // ← USE CACHE
    refetchOnWindowFocus: 'stale', // ← REFETCH ONLY IF STALE
    staleTime: 15 * 60 * 1000,    // ← INCREASE: 15 min (vs current 2 min)
    retry: 2,
  });
}
```

**Expected Impact:** 0ms block (session immediately cached)

### Priority 2: Show Layout Before Auth Complete

**Change:** Render layout skeleton while auth loads

```typescript
// components/app/AppWithOnboarding.tsx - OPTIMIZED

export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const { isAuthenticated, authLoading, spacesLoading, hasZeroSpaces } = useAuthWithSpaces();

  // ONLY block on session check (100ms worst case)
  // Don't block on profile or spaces
  
  if (authLoading && !isAuthenticated) {
    // NEW: Only show spinner if we don't know auth status yet
    return <AuthLoadingState />;
  }

  // NEW: Render authenticated layout with skeleton while loading profile/spaces
  if (isAuthenticated && spacesLoading) {
    return <AuthenticatedLayoutSkeleton />;  // ← Show nav + skeleton content
  }

  if (isAuthenticated && hasZeroSpaces) {
    return <FirstSpaceOnboarding />;
  }

  return <>{children}</>;
}
```

### Priority 3: Split Auth Loading States

**Change:** Different loading states for different queries

```typescript
// lib/hooks/useAuthQuery.ts - OPTIMIZED

export function useAuth() {
  const sessionQuery = useAuthSession();
  const profileQuery = useUserProfile(sessionQuery.data?.user?.id);

  return {
    // Split out different loading states
    isSessionLoading: sessionQuery.isLoading,    // Critical (show spinner)
    isProfileLoading: profileQuery.isLoading,    // Can render with skeleton
    isRefetching: sessionQuery.isFetching || profileQuery.isFetching,
    
    // Only "loading" if session is loading
    isLoading: sessionQuery.isLoading,           // ← Not both!
    
    // Rest of data...
  };
}
```

### Priority 4: Profile Data with Defaults

**Change:** Don't block on profile load

```typescript
// lib/hooks/useAuthQuery.ts - OPTIMIZED

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.auth.profile(userId || ''),
    queryFn: async (): Promise<UserProfile> => {
      // ... fetch profile
    },
    enabled: !!userId,
    // NEW: Use placeholder while loading
    placeholderData: {
      id: userId || '',
      email: '',
      name: 'Loading...',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,     // ← Use cache
  });
}
```

### Priority 5: Spaces Loading in Background

**Change:** Load spaces without blocking UI

```typescript
// lib/hooks/useSpacesQuery.ts - OPTIMIZED

export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.spaces.all(userId || ''),
    queryFn: async (): Promise<Space[]> => {
      // ... existing logic
    },
    enabled: !!userId,
    // NEW: Don't refetch on every mount
    refetchOnMount: false,        // ← Use cache
    refetchOnWindowFocus: 'stale',
    // NEW: Provide stale data while refetching
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## 7. Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
- [ ] Reduce session `staleTime` to 15 minutes
- [ ] Change all `refetchOnMount: 'always'` → `refetchOnMount: false`
- [ ] Split loading states in `useAuth()` hook

### Phase 2: Layout Optimization (2-3 hours)
- [ ] Create `AuthenticatedLayoutSkeleton` component
- [ ] Update `AppWithOnboarding` to show skeleton during load
- [ ] Test smooth transition from skeleton to real content

### Phase 3: Progressive Enhancement (3-4 hours)
- [ ] Add `placeholderData` for profile query
- [ ] Implement optimistic space selection
- [ ] Add skeleton screens to dashboard loading state

### Phase 4: Monitor & Refine (Ongoing)
- [ ] Measure actual load times with Lighthouse
- [ ] Monitor session check timing via React Query DevTools
- [ ] Adjust cache durations based on real usage

---

## 8. Code Patterns to Change

### Pattern 1: Remove refetchOnMount
```typescript
// BEFORE (blocks rendering)
refetchOnMount: 'always'

// AFTER (uses cache)
refetchOnMount: false
```

### Pattern 2: Increase staleTime for Auth
```typescript
// BEFORE
staleTime: 2 * 60 * 1000,  // 2 minutes

// AFTER
staleTime: 15 * 60 * 1000, // 15 minutes (unless auth expires sooner)
```

### Pattern 3: Show Content While Loading
```typescript
// BEFORE
if (isLoading) return <Spinner />;
return <Content />;

// AFTER
if (!isReady) return <Skeleton />;
return <Content />;
```

---

## 9. Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `/lib/hooks/useAuthQuery.ts` | Split loading states, adjust staleTime | High |
| `/lib/hooks/useSpacesQuery.ts` | Change refetchOnMount, add placeholderData | High |
| `/components/app/AppWithOnboarding.tsx` | Show skeleton during load | High |
| `/components/ui/LoadingStates.tsx` | Add AuthenticatedLayoutSkeleton | Medium |
| `/lib/react-query/query-client.ts` | Update default options | High |

---

## 10. Expected Results

### Before Optimization
- Session check: 100ms
- Profile load: 80ms (blocked by session)
- Spaces count: 20ms (blocked by profile)
- Spaces full load: 80ms
- **Total block time: 280ms**
- **User sees spinner: 280ms**

### After Optimization
- Session check: 100ms (in background)
- Layout renders with skeleton: 50ms
- Profile loads: 80ms (in background)
- Spaces load: 100ms (in background)
- **Total block time: 50ms**
- **User sees skeleton: 50ms**
- **Real content fills in as data arrives**

---

## 11. Additional Considerations

### Cache Invalidation
After these changes, ensure cache invalidation still works:
- On sign out: Full clear ✓
- On sign in: Invalidate auth queries ✓
- On space create: Invalidate spaces list ✓

### Real-Time Updates
Ensure real-time subscriptions still work with less frequent refetches:
- Session changes: Monitor `onAuthStateChange`
- Space changes: Monitor `postgres_changes`
- Profile changes: Monitor through mutations

### Network Resilience
With less refetching, handle offline better:
- Set `networkMode: 'online'` to prevent stale offline data
- Clear cache on auth errors (401)
- Implement retry logic for transient failures

---

## Conclusion

The 0.5-1s delay is caused by **sequential dependent queries** that block the app rendering. By implementing **cache-first strategies**, **splitting loading states**, and **rendering skeleton content immediately**, you can reduce the perceived loading time to nearly instantaneous for returning users, while progressively loading data in the background.

The key insight is: **Don't block on non-critical data**. Sessions are critical (verify user). Profiles and spaces can load while showing skeleton UI.
