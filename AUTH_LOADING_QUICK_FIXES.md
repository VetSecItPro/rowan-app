# Authentication Loading - Quick Fix Reference

## TL;DR - 3-Minute Overview

**Problem:** 0.5-1s "Loading authentication..." spinner blocks the entire app  
**Root Cause:** 3 sequential database queries that must complete before rendering  
**Solution:** Cache-first strategy + skeleton UI while data loads  
**Impact:** ~50ms spinner (or instant with cache) vs current 500ms

---

## The 3 Critical Queries (In Order)

```
┌─────────────┐
│   Session   │ (100ms) ← Supabase auth session check
│   Check     │
└──────┬──────┘
       │ BLOCKS
       ▼
┌─────────────┐
│  Profile    │ (80ms) ← Get user details (name, avatar, etc.)
│   Load      │
└──────┬──────┘
       │ BLOCKS
       ▼
┌─────────────┐
│   Spaces    │ (100ms) ← Get user's workspaces
│   Load      │
└─────────────┘

TOTAL: ~300ms of blocking
```

---

## Where "Loading authentication..." Appears

**File:** `/components/ui/LoadingStates.tsx` (lines 5-14)
**Trigger:** `/components/app/AppWithOnboarding.tsx` (line 43-44)

```typescript
if (authLoading) {
  return <AuthLoadingState />;  // ← This blocks everything
}
```

---

## 5 Changes to Reduce Load Time to 50ms

### Change 1: Stop Refetching on Mount (useAuthQuery.ts)

**Current:**
```typescript
export function useAuthSession() {
  return useQuery({
    queryFn: async () => { /* get session */ },
    refetchOnMount: 'always',  // ← ALWAYS re-fetch!
    staleTime: 2 * 60 * 1000,  // 2 minutes
  });
}
```

**Optimized:**
```typescript
export function useAuthSession() {
  return useQuery({
    queryFn: async () => { /* get session */ },
    refetchOnMount: false,      // ← USE CACHE instead
    staleTime: 15 * 60 * 1000,  // ← INCREASE to 15 min
  });
}
```

**Effect:** Session returns from cache instantly (0ms) instead of waiting for Supabase (100ms)

---

### Change 2: Stop Refetching Profiles on Mount (useAuthQuery.ts)

**Current:**
```typescript
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryFn: async () => { /* get profile */ },
    enabled: !!userId,
    refetchOnMount: 'always',  // ← ALWAYS re-fetch!
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

**Optimized:**
```typescript
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryFn: async () => { /* get profile */ },
    enabled: !!userId,
    refetchOnMount: false,      // ← USE CACHE
    staleTime: 5 * 60 * 1000,
    placeholderData: {          // ← NEW: Show placeholder while loading
      id: userId || '',
      email: '',
      name: 'Loading...',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
```

**Effect:** Profile returns from cache/placeholder immediately instead of waiting for Supabase (80ms)

---

### Change 3: Stop Refetching Spaces on Mount (useSpacesQuery.ts)

**Current:**
```typescript
export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    queryFn: async () => { /* get spaces */ },
    enabled: !!userId,
    refetchOnMount: 'always',  // ← ALWAYS re-fetch!
  });
}
```

**Optimized:**
```typescript
export function useUserSpaces(userId: string | undefined) {
  return useQuery({
    queryFn: async () => { /* get spaces */ },
    enabled: !!userId,
    refetchOnMount: false,      // ← USE CACHE
    staleTime: 5 * 60 * 1000,
  });
}
```

**Effect:** Spaces returns from cache immediately instead of waiting for Supabase (100ms)

---

### Change 4: Split Loading States (useAuthQuery.ts)

**Current:**
```typescript
export function useAuth() {
  const sessionQuery = useAuthSession();
  const profileQuery = useUserProfile(...);
  
  const isLoading = sessionQuery.isLoading;  // ← Stays true for entire duration
  
  return { isLoading, /* ... */ };
}
```

**Optimized:**
```typescript
export function useAuth() {
  const sessionQuery = useAuthSession();
  const profileQuery = useUserProfile(...);
  
  // Split out different loading states
  const isSessionLoading = sessionQuery.isLoading;      // Critical - block on this
  const isProfileLoading = profileQuery.isLoading;      // Can render with placeholder
  const isLoading = isSessionLoading;                   // ← Only critical queries
  
  return {
    isLoading,
    isSessionLoading,
    isProfileLoading,
    /* ... */
  };
}
```

**Effect:** App can render while profile loads in background

---

### Change 5: Show Skeleton Instead of Spinner (AppWithOnboarding.tsx)

**Current:**
```typescript
export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const { authLoading, spacesLoading } = useAuthWithSpaces();

  if (authLoading) {
    return <AuthLoadingState />;  // ← Full-screen spinner
  }

  if (spacesLoading) {
    return <SpacesLoadingState />;  // ← Another spinner
  }

  return <>{children}</>;
}
```

**Optimized:**
```typescript
export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const { isAuthenticated, authLoading, spacesLoading } = useAuthWithSpaces();

  // Only block on session check (if we don't know auth status yet)
  if (authLoading && !isAuthenticated) {
    return <AuthLoadingState />;
  }

  // NEW: Show layout skeleton while spaces load
  if (isAuthenticated && spacesLoading) {
    return <AuthenticatedLayoutSkeleton />;  // ← Show nav + placeholder content
  }

  return <>{children}</>;
}
```

**Effect:** User sees skeleton UI with navigation immediately, content fills in as data arrives

---

## Before/After Timeline

### Before (Current)

```
0ms       100ms      200ms      300ms      400ms      500ms
────────────────────────────────────────────────────────────
Session    [████]
            │
            └─ Profile [████]
                        │
                        └─ Spaces [████]
                                   │
                                   └─ Render UI


User sees: SPINNING LOADER FOR 500ms
           (entire app blocked)
```

### After (Optimized)

```
0ms       50ms       100ms      150ms      200ms      250ms
────────────────────────────────────────────────────────────
Session (cache) [██]
Profile (cache) [██]
Spaces (cache)  [██]
                │
Render UI [██]  (IMMEDIATE)
                │
                ├─ Session refresh [████] (background)
                ├─ Profile refresh [████] (background)
                └─ Spaces refresh [████] (background)


User sees: SKELETON LAYOUT FOR 50ms
           (then real content fills in as it arrives)
           (user can interact immediately)
```

---

## Files to Modify (Quick Checklist)

```
✓ MUST FIX (High Impact)
├─ lib/hooks/useAuthQuery.ts
│  ├─ useAuthSession: refetchOnMount: false
│  ├─ useUserProfile: refetchOnMount: false + placeholderData
│  └─ useAuth: split loading states
│
├─ lib/hooks/useSpacesQuery.ts
│  └─ useUserSpaces: refetchOnMount: false
│
├─ components/app/AppWithOnboarding.tsx
│  ├─ Update condition for authLoading
│  └─ Add skeleton rendering
│
└─ components/ui/LoadingStates.tsx
   └─ Add AuthenticatedLayoutSkeleton component

○ NICE TO HAVE (Medium Impact)
├─ lib/react-query/query-client.ts
│  └─ Update default options
│
└─ lib/hooks/useAuthWithSpaces.tsx
   └─ Update to use split loading states
```

---

## Code Patterns - Before/After

### Pattern 1: Query Configuration

**BEFORE:**
```typescript
return useQuery({
  queryKey: ['auth', 'session'],
  queryFn: async () => { /* ... */ },
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  staleTime: 2 * 60 * 1000,
});
```

**AFTER:**
```typescript
return useQuery({
  queryKey: ['auth', 'session'],
  queryFn: async () => { /* ... */ },
  refetchOnMount: false,              // ← Cache first
  refetchOnWindowFocus: 'stale',      // ← Only if stale
  staleTime: 15 * 60 * 1000,          // ← Longer cache
});
```

### Pattern 2: Loading State Handling

**BEFORE:**
```typescript
if (isLoading) {
  return <FullScreenSpinner />;  // Blocks everything
}
return <Content />;
```

**AFTER:**
```typescript
if (isCriticalLoading && !data) {
  return <FullScreenSpinner />;  // Only for critical data
}
if (isLoading && data) {
  return <Skeleton />;  // Show skeleton while updating
}
return <Content data={data} />;  // Show content immediately
```

### Pattern 3: Component Logic

**BEFORE:**
```typescript
const { loading, data } = useData();

return loading ? <Spinner /> : <Content data={data} />;
```

**AFTER:**
```typescript
const { isLoading, data, isFetching } = useData();

if (isLoading && !data) {
  return <Spinner />;  // No data yet
}
if (isFetching) {
  return <Skeleton />;  // Have data, but updating
}
return <Content data={data} />;
```

---

## Testing Checklist

After making changes, test:

- [ ] Cold start (first-time user): Should show skeleton UI within 50ms
- [ ] Warm start (returning user): Should show cached content within 0-50ms
- [ ] Slow 3G network: Should show skeleton, then progressive content load
- [ ] Offline then online: Cache should work offline, refetch when online
- [ ] Session expiry: Should show login page when session expires
- [ ] Real-time updates: Spaces changes should update even with longer staleTime
- [ ] Mobile: Touch interactions should work immediately (not blocked by spinner)
- [ ] Dark/Light mode: Skeleton should match theme

---

## Performance Targets

After optimization, you should see:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Time to Spinner | N/A | 50ms | <100ms |
| Time to Skeleton | 500ms | 50ms | <100ms |
| Time to First Content | 500ms | 100-150ms | <300ms |
| Time to Fully Loaded | 500ms | 150-250ms | <500ms |
| Returning User Load | 500ms | 0-50ms | <100ms |

---

## Rollback Plan

If something breaks, you can quickly revert:

```bash
# Revert to blocking (old behavior)
git diff lib/hooks/useAuthQuery.ts  # See what changed
git checkout lib/hooks/useAuthQuery.ts  # Revert just this file

# Or revert everything
git reset --hard HEAD~1
```

---

## Common Issues & Fixes

### Issue: "Profile is undefined" after cache change

**Cause:** Code expects profile to always exist  
**Fix:** Use optional chaining or check with placeholderData
```typescript
// BEFORE (assumes profile always exists)
<span>{profile.name}</span>

// AFTER (handles undefined)
<span>{profile?.name || 'Loading...'}</span>
```

### Issue: Real-time updates not working

**Cause:** Cache is too aggressive  
**Fix:** Keep refetchOnWindowFocus or set shorter refetchInterval
```typescript
return useQuery({
  // ...
  refetchOnMount: false,
  refetchOnWindowFocus: 'stale',  // ← Keep this
  refetchInterval: 30 * 1000,     // ← Add if needed (30s)
});
```

### Issue: Session expires but app doesn't update

**Cause:** Not refetching session  
**Fix:** Keep session refetching more aggressive
```typescript
export function useAuthSession() {
  return useQuery({
    // ...
    staleTime: 5 * 60 * 1000,          // ← Shorter than profile
    refetchInterval: 30 * 60 * 1000,    // ← Auto-refetch every 30 min
  });
}
```

---

## Next Steps

1. **Start with Change 1** (useAuthSession refetchOnMount)
   - Test that it works and doesn't break anything
   - Measure the improvement

2. **Add Change 2** (useUserProfile refetchOnMount + placeholder)
   - Add placeholderData to show "Loading..." name
   - Test that UI doesn't break with placeholder

3. **Add Change 3** (useUserSpaces refetchOnMount)
   - Most straightforward change
   - Spaces list will come from cache

4. **Add Change 4** (Split loading states)
   - More surgical approach
   - App can differentiate between critical and non-critical loading

5. **Add Change 5** (Skeleton UI)
   - Create AuthenticatedLayoutSkeleton component
   - Update AppWithOnboarding logic
   - Test smooth transitions

6. **Measure & Monitor**
   - Use React Query DevTools to see query times
   - Check Lighthouse metrics
   - Monitor real user performance

---

## Performance Monitoring

Add this to check performance:

```typescript
// lib/utils/performance-logging.ts
export function logQueryTiming(queryKey: string[], duration: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Query [${queryKey.join(':')}] took ${duration}ms`);
  }
}

// In your query:
const start = performance.now();
const queryFn = async () => {
  const result = await fetch(...);
  const duration = performance.now() - start;
  logQueryTiming(queryKey, duration);
  return result;
};
```

---

## Final Notes

The key insight: **Don't block on non-critical data**

- Session check: CRITICAL (verify user is logged in)
- Profile load: NON-CRITICAL (can show placeholder)
- Spaces load: NON-CRITICAL (can show cache + skeleton)

By using cache-first and showing skeleton UI, returning users see content instantly, and new users see layout within 50ms instead of 500ms.

This is a simple but high-impact optimization that improves perceived performance dramatically.
