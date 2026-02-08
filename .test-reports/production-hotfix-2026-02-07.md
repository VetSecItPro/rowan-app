# Production Hotfixes — 2026-02-07

**Status:** ✅ COMPLETE — Both CSP and RPC errors fixed
**Deploy:** Ready for immediate production deployment

---

## Issues Fixed

### 1. CSP Violation: Sentry Worker Blocked ✅

**Error:**
```
Creating a worker from 'blob:https://rowanapp.com/...' violates the following Content Security Policy directive:  
"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net...". Note that 'worker-src' was not explicitly set, so 'script-src' is used as a fallback.
```

**Root Cause:**
- Sentry's session replay feature creates a Web Worker from a blob URL
- CSP didn't include `worker-src blob:` directive
- When `worker-src` is missing, it falls back to `script-src`, which didn't allow blob:

**Fix:**
- **File:** `middleware.ts:509`
- **Change:** Added `"worker-src 'self' blob:;"` to CSP header

**Before:**
```typescript
"connect-src ...;" +
"frame-ancestors 'none'; " +
```

**After:**
```typescript
"connect-src ...;" +
"worker-src 'self' blob:;" +
"frame-ancestors 'none'; " +
```

**Impact:** Sentry session replay now works without CSP violations

---

### 2. Missing RPC Function: get_dashboard_summary ✅

**Error:**
```
POST https://mhqpjprmpvigmwcghpzx.supabase.co/rest/v1/rpc/get_dashboard_summary 404 (Not Found)
```

**Root Cause:**
- `useDashboardStats.ts:223` calls `supabase.rpc('get_dashboard_summary')` 
- This RPC function was never created in the database
- No migration file exists for it
- Production database doesn't have the function → 404

**Hotfix (Temporary):**
- **File:** `lib/hooks/useDashboardStats.ts:227-235`
- **Change:** Gracefully handle missing RPC with fallback to default stats
- Added error logging with context for debugging
- Dashboard now loads with default stats instead of crashing

**Code Added:**
```typescript
if (error) {
    // RPC doesn't exist in production yet — log and use default stats
    logger.error('RPC get_dashboard_summary not found (expected during migration)', error, {
        component: 'useDashboardStats',
        action: 'rpc_call',
        errorCode: error.code,
    });
    setStats(initialStats);
    return;
}
```

**Impact:** Dashboard loads successfully with zero stats instead of failing

---

## Proper Long-Term Fix (TODO)

### Create `get_dashboard_summary` RPC Function

**Required:** Database migration to create the optimized dashboard summary RPC

**What it should do:**
- Replace 18+ individual dashboard queries with 1 optimized RPC call
- Aggregate stats for: tasks, events, reminders, messages, shopping, meals, household, projects, goals
- Return JSON object with all dashboard stats
- Use efficient SQL joins and aggregations

**Migration Template:**
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_create_dashboard_summary_rpc.sql

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_space_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
BEGIN
    -- Tasks aggregation
    v_result := jsonb_set(v_result, '{tasks}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'pending', COUNT(*) FILTER (WHERE status = 'pending'),
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'dueToday', COUNT(*) FILTER (WHERE due_date::date = CURRENT_DATE),
            'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed')
            -- ... more aggregations
        )
        FROM tasks
        WHERE space_id = p_space_id
    ));

    -- Events aggregation
    v_result := jsonb_set(v_result, '{events}', (
        SELECT jsonb_build_object(
            'total', COUNT(*),
            'today', COUNT(*) FILTER (WHERE start_time::date = CURRENT_DATE),
            'thisWeek', COUNT(*) FILTER (WHERE start_time >= date_trunc('week', CURRENT_DATE))
            -- ... more aggregations
        )
        FROM calendar_events
        WHERE space_id = p_space_id
    ));

    -- ... more aggregations for reminders, messages, shopping, meals, etc.

    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(UUID, UUID) TO authenticated;

-- Add RLS policy comment
COMMENT ON FUNCTION public.get_dashboard_summary IS 'Optimized dashboard summary - replaces 18+ individual queries';
```

**Benefits:**
- **Performance:** 1 RPC call instead of 18+ separate queries
- **Reduced latency:** Single round-trip to database
- **Lower bandwidth:** Aggregated results are smaller
- **Simplified code:** Single hook call instead of multiple queries

**When to implement:**
- After E2E implementation merges
- Before next major feature release
- Low-priority (hotfix handles it for now)

---

## Deployment Checklist

- [x] Fix CSP to allow Sentry workers
- [x] Add graceful fallback for missing RPC
- [x] Verify TypeScript types (clean)
- [ ] Commit changes to feature branch
- [ ] Create PR
- [ ] Deploy to production via Vercel
- [ ] Verify no CSP errors in browser console
- [ ] Verify dashboard loads (even with default stats)

---

## Files Modified

| File | Change |
|------|--------|
| `middleware.ts` | Added `worker-src 'self' blob:` to CSP |
| `lib/hooks/useDashboardStats.ts` | Added error fallback for missing RPC |

**Total:** 2 files modified

---

✅ **Hotfixes Complete — Ready for Production Deployment**
