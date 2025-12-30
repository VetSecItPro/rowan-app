# Rowan App Comprehensive Optimization Audit
**Date:** December 30, 2025
**Auditor:** Claude Code
**App Version:** feature/security-rls-fixes branch

---

# TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Desktop Optimization Audit](#desktop-optimization-audit)
3. [Mobile Optimization Audit](#mobile-optimization-audit)
4. [Database & Query Analysis](#database--query-analysis)
5. [Real-Time Subscriptions Analysis](#real-time-subscriptions-analysis)
6. [Authentication & Session Analysis](#authentication--session-analysis)
7. [Page-Level Performance Analysis](#page-level-performance-analysis)
8. [Component Optimization Analysis](#component-optimization-analysis)
9. [Third-Party Integrations Analysis](#third-party-integrations-analysis)
10. [Forms & User Interactions Analysis](#forms--user-interactions-analysis)
11. [Comprehensive TODO List](#comprehensive-todo-list)
12. [Implementation Plan](#implementation-plan)

---

# EXECUTIVE SUMMARY

## Overall Scores

| Category | Score | Status |
|----------|-------|--------|
| Desktop Performance | 7.5/10 | Good with improvements needed |
| Mobile Performance | 9/10 | Excellent, production-ready |
| Database Queries | 6/10 | N+1 issues and missing caching |
| Real-Time | 7/10 | Good but channel filtering issues |
| Authentication | 6.5/10 | Redundant calls and missing caching |
| Third-Party | 7/10 | Sequential processing issues |

## Critical Issues Found

1. **N+1 Query in Messages** - Unread counts query per conversation
2. **Activity Feed 11 Queries** - Could be single RPC
3. **Dashboard Channels No Space Filter** - Cross-space data leak risk
4. **Middleware 2+ RPC Calls Per Request** - Uncached auth checks
5. **Daily Digest Sequential Processing** - 5-10 min for 100 users

## Quick Wins Identified

1. Add HTTP Cache-Control headers to GET routes
2. Memoize 5 large components (5 min each)
3. Add debounce to 10+ search inputs
4. Compress logo from 456KB to ~80KB

---

# IMPLEMENTATION PROGRESS

**Last Updated:** December 30, 2025

## Completed Batches

### Batch 1 (Completed)
- [x] N+1 query fixes (messages unread count RPC)
- [x] Component memoization (5 large components)
- [x] Search input debouncing (initial set)
- [x] Logo compression (456KB → ~80KB)

### Batch 2 (Completed)
- [x] Middleware static assets early return
- [x] Goals channel space_id filter
- [x] refetchOnMount changed to 'stale'
- [x] useChoreRealtime batching (50ms debounce)
- [x] Stripe webhook async email sending

### Batch 3 (Completed)
- [x] Activity feed Redis caching (5-minute TTL)

### Batch 4 (Completed)
- [x] HTTP Cache-Control headers added to 6 API routes:
  - `/api/chores` - withUserDataCache
  - `/api/messages` - withDynamicDataCache
  - `/api/goals` - withUserDataCache
  - `/api/meals` - withUserDataCache
  - `/api/expenses` - withUserDataCache
  - `/api/projects` - withUserDataCache

### Batch 5 (Completed)
- [x] Search debouncing added to 5 components:
  - ConversationSidebar (300ms + useMemo filter)
  - TemplateSelectionModal/goals (300ms + useMemo)
  - ForwardMessageModal (300ms + useMemo)
  - UsersPanel/admin (300ms + useMemo)
  - TemplatePickerModal/tasks (300ms + useMemo)
- [x] Index-based keys reviewed (most are skeleton loaders - acceptable)
- [x] Middleware caching verified (admin-session, beta-validation already cached)

### Batch 6 (Completed)
- [x] Daily digest - already optimized with batch processing (5 parallel)
- [x] Email service parallel batch processing (10 concurrent, was sequential)
- [x] Google Calendar token retrieval (Promise.all parallel fetch)
- [x] Dashboard progressive loading - **DEFERRED** (see note below)

### Batch 7 (Completed)
- [x] Dashboard channels space_id filter - VERIFIED already filtered correctly
- [x] Cache-Control headers - VERIFIED all 10 main routes already have headers
- [x] Remaining search debouncing (5 components):
  - DependenciesModal.tsx (300ms debounce)
  - documentation/SearchBar.tsx (200ms debounce)
  - expenses/RecurringPatternsList.tsx (300ms debounce)
  - achievements/BadgeGallery.tsx (300ms debounce)
  - expenses/ReceiptLibrary.tsx (300ms debounce)

### Batch 8 (Completed)
- [x] Redis caching for conversation lists (2-minute TTL)
  - Added CONVERSATIONS and GOAL_STATS cache prefixes
  - Wrapped getConversationsList with cacheAside
  - Cache invalidation on createConversation and createMessage
- [x] Redis caching for goal statistics (5-minute TTL)
  - Wrapped getGoalStats with cacheAside
  - Cache invalidation on createGoal and updateGoal
- [x] Updated invalidateSpaceCache to include new cache types

### Build Fixes
- [x] beta-expiration-emails route: Use centralized supabaseAdmin (build-safe)

## Deferred Items

### Projects Incremental Updates
**Status:** DEFERRED - Complex refactor required
**Reason:** Requires significant state management changes, moderate risk
**File:** `app/(main)/projects/page.tsx`
**Current:** Any change triggers full `loadData()` reload
**Fix Required:** Implement incremental state updates (add/update/remove from state)

### Dashboard Progressive Loading with Suspense
**Status:** DEFERRED - Acceptable current state
**Reason:** High effort (~6-10 hours), low incremental gain (~500ms-1s improvement)

**Current State:**
- Dashboard already uses Promise.all to fetch all 20 data sources in parallel
- Users see loading spinner until slowest request completes (~1-2s typical)

**What Would Be Required:**
1. Break monolithic `loadAllStats` into 10+ separate React Query hooks (2-3 hrs)
2. Create Suspense boundaries around each dashboard section (1-2 hrs)
3. Create skeleton components for each section (1-2 hrs)
4. Handle data interdependencies (check-ins, activity feed) (1 hr)
5. Refactor real-time subscriptions into section components (1-2 hrs)

**Risks of Doing:**
- Regression bugs from data dependency changes
- Increased codebase complexity (more files, hooks)
- Testing burden for each section

**Risks of Deferring:**
- Users wait for slowest request (currently acceptable at 1-2s)
- Technical debt (monolithic approach works but isn't ideal)

**When to Reconsider:**
- User complaints about dashboard load times
- Adding new dashboard sections becomes painful
- Major React Query migration planned
- Lighthouse performance scores drop significantly

---

# DESKTOP OPTIMIZATION AUDIT

## What's Working Well

### 1. Caching Infrastructure (Excellent)
- **Multi-layer caching**: Redis + Service Worker + HTTP headers
- **Smart TTLs**: SHORT (1min) → MEDIUM (5min) → LONG (10min) → VERY_LONG (1hr)
- **Admin cache**: Aggressive caching (5-15min) for expensive dashboard queries
- **Weather cache**: 3-hour forecast cache, 30-day geocoding cache

**Key Files:**
- `lib/cache.ts` - General cache service (206 lines)
- `lib/services/admin-cache-service.ts` - Admin dashboard caching (139 lines)
- `lib/services/weather-cache-service.ts` - Weather API caching (177 lines)

### 2. React Query Integration (Excellent)
- Stale-while-revalidate (5min stale time)
- 10-minute garbage collection
- Smart retry logic (skips 4xx, exponential backoff for 5xx)
- Batch cache invalidation support

**File:** `lib/react-query/query-client.ts`

### 3. Code Splitting (Good)
Dynamic imports implemented for:
- Charts via `DynamicCharts.tsx`
- Modals via `DynamicMealComponents.tsx`, `DynamicSettingsComponents.tsx`
- Admin panels via `DynamicLoaders.tsx`
- Goals charts via `DynamicGoalsCharts.tsx`

### 4. Bundle Optimization (Good)
- `optimizePackageImports` for lucide-react, framer-motion
- Sentry tree-shaking enabled
- Console removal in production
- Bundle analyzer configured (`ANALYZE=true`)

**File:** `next.config.mjs`

## Issues Found

### Issue 1: Missing HTTP Caching Headers
**Impact:** High - Unnecessary re-fetches, increased server load
**Current:** Only 4 of 150+ routes have Cache-Control headers

**Routes needing headers:**
- `/api/tasks`
- `/api/shopping`
- `/api/calendar`
- `/api/meals`
- `/api/reminders`
- `/api/goals`
- `/api/messages`
- `/api/expenses`
- `/api/projects`
- `/api/chores`

### Issue 2: Large Components Without Memoization

| Component | Lines | File |
|-----------|-------|------|
| CalendarConnections.tsx | 1,342 | `components/calendar/` |
| UnifiedItemModal.tsx | 922 | `components/shared/` |
| NewEventModal.tsx | 857 | `components/calendar/` |
| NotificationSettings.tsx | 848 | `components/settings/` |
| YearInReviewDashboard.tsx | 752 | `components/year-in-review/` |

### Issue 3: YearInReviewDashboard Not Lazy Loaded
**File:** `components/year-in-review/YearInReviewDashboard.tsx`
**Impact:** Recharts bundle (~150KB) loads on every page

### Issue 4: Logo Image Unoptimized
**File:** `public/rowan-logo.png`
**Current:** 456KB for 660x650px
**Target:** ~80-100KB

### Issue 5: Raw img Tags (3 instances)
- `components/shopping/DraggableItemsList.tsx`
- `components/goals/GoalCard.tsx`
- `components/meals/MealCard.tsx`

### Issue 6: Index-Based Keys (21 instances)
Files affected:
- `EventProposalModal.tsx`
- `NewShoppingListModal.tsx`
- `MiniCalendar.tsx`
- `YearInReviewDashboard.tsx`
- `NewMealModal.tsx`
- `BetaFeedbackPanel.tsx`

---

# MOBILE OPTIMIZATION AUDIT

## What's Working Well (Mobile)

### 1. PWA Configuration (Excellent)
**File:** `public/manifest.json`
- Standalone display mode with minimal-ui fallback
- App shortcuts (Task, Reminder, Shopping, Calendar)
- Share target for native sharing
- Screenshots for install promotions

### 2. Service Worker (Excellent)
**File:** `public/sw.js` (542 lines)

Caching strategies:
- **Cache-First**: Static assets (JS, CSS, fonts, images)
- **Network-First**: API routes with offline fallback
- **Stale-While-Revalidate**: Next.js static assets
- Push notification support
- Background sync for offline queue
- Automatic cache versioning

### 3. Touch Optimization (Excellent)
- 48x48px minimum touch targets
- Form inputs at 16px (prevents iOS zoom)
- Proper tap highlighting
- Touch scroll optimization (`-webkit-overflow-scrolling: touch`)

### 4. Safe Area Support (Excellent)
**File:** `globals.css`
- iOS notch handling (`env(safe-area-inset-*)`)
- Landscape notch support
- FAB positioning with `pb-safe`

### 5. Accessibility (Excellent)
- `prefers-reduced-motion` support
- Proper ARIA roles
- Screen reader compatible

### 6. Offline Support (Excellent)
**File:** `components/ui/NetworkStatus.tsx`
- Network status detection
- Offline queue with persistence
- Sync status indicators
- Failed action warnings

### 7. Native Features (Good)
**Files:**
- `lib/utils/haptics.ts` - Haptic feedback API
- `lib/utils/share.ts` - Web Share API
- iOS keyboard avoidance in `globals.css`
- Landscape orientation support

## Mobile Issues Found

### Issue 1: No List Virtualization
**Impact:** Performance degradation with 100+ items
**Affected:** Tasks, Reminders, Shopping lists
**Solution:** Use existing `VirtualizedList` component from `lib/performance`

### Issue 2: Missing Pull-to-Refresh
**Impact:** Users expect native-like refresh gesture

### Issue 3: Filter Dropdowns on Mobile
**Impact:** Too many filter buttons crowd mobile UI

### Issue 4: Missing Features
- Swipe gestures (delete, complete)
- Splash screens for PWA
- Slow network detection

---

# DATABASE & QUERY ANALYSIS

## Critical N+1 Query Issues

### Issue 1: Messages Unread Count
**File:** `lib/services/messages-service.ts`
**Lines:** 882-896

```typescript
// CURRENT: N+1 queries
const conversationsWithUnread = await Promise.all(
  conversations.map(async (conv) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read', false)
      .neq('sender_id', userId);
  })
);
```

**Impact:** 10 conversations = 11 queries, 100 conversations = 101 queries

**Fix:** Create RPC function:
```sql
CREATE OR REPLACE FUNCTION get_unread_counts_by_conversation(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
  SELECT conversation_id, COUNT(*) as unread_count
  FROM messages
  WHERE read = false AND sender_id != p_user_id
  GROUP BY conversation_id
$$ LANGUAGE SQL STABLE;
```

### Issue 2: Activity Feed 11 Parallel Queries
**File:** `lib/services/activity-feed-service.ts`
**Lines:** 28-40

**Current:** 11 separate queries to:
- tasks, goals, messages, events, checkIns
- shoppingLists, meals, expenses, projects, reminders, chores

**Fix:** Create unified `get_recent_activity(space_id, limit)` RPC with UNION ALL

### Issue 3: Task Creation Notification Queries
**File:** `lib/services/tasks-service.ts`
**Lines:** 302-335

**Current:** 3 queries for creator name, assignee name, space name

**Fix:** Cache user/space names in Redis with 10-minute TTL

## Query Optimization Issues

### Task Stats JavaScript Aggregation
**File:** `lib/services/tasks-service.ts`
**Lines:** 536-580

**Current:** Fetches all tasks, filters in JavaScript (6+ iterations)

```typescript
// Inefficient
const total = data.length;
const completed = data.filter((t) => t.status === 'completed').length;
const inProgress = data.filter((t) => t.status === 'in-progress').length;
```

**Fix:** SQL aggregation function:
```sql
CREATE OR REPLACE FUNCTION get_task_stats(p_space_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in-progress'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending')
  )
  FROM tasks WHERE space_id = p_space_id
$$ LANGUAGE SQL STABLE;
```

### Shopping List Waterfall
**File:** `app/(main)/tasks/page.tsx`
**Lines:** 228-263

**Current:** For each task, separate `getShoppingListsForTask(task.id)` call

**Fix:** Batch endpoint accepting array of task IDs

## Caching Gaps

| Service | Current | Recommended TTL |
|---------|---------|-----------------|
| Activity feed | No cache | 5-10 min |
| Conversation lists | No cache | 2 min |
| Goal statistics | No cache | 5 min |
| User/space names | No cache | 10 min |

## Database Indexes to Verify

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_space_status ON tasks(space_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_space_due ON tasks(space_id, due_date);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_goals_space_status ON goals(space_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_space_due ON reminders(space_id, due_date);
```

---

# REAL-TIME SUBSCRIPTIONS ANALYSIS

## Subscription Overview

| Hook/Page | Channel | Filter | Status |
|-----------|---------|--------|--------|
| useTaskRealtime | `tasks:${spaceId}` | space_id | Excellent |
| useChoreRealtime | `chores:${spaceId}` | space_id | Needs batching |
| useRemindersRealtime | `reminders:${spaceId}` | space_id | Excellent |
| useCalendarRealtime | `calendar:${spaceId}` | space_id | Excellent |
| Dashboard | `dashboard_*` | NONE | CRITICAL |
| Goals page | `goals-changes` | in callback only | Poor |
| Projects page | `projects_*:${spaceId}` | space_id | Full reload issue |

## Critical Issues

### Issue 1: Dashboard Channels Missing Space Filter
**File:** `app/(main)/dashboard/page.tsx`

**Current channels (10):**
- `dashboard_tasks`
- `dashboard_events`
- `dashboard_reminders`
- `dashboard_messages`
- `dashboard_shopping`
- `dashboard_meals`
- `dashboard_chores`
- `dashboard_goals`
- `dashboard_projects`
- `dashboard_expenses`

**Problem:** No space_id - could receive cross-space data

**Fix:** Change to `dashboard_tasks:${spaceId}`, etc.

### Issue 2: Goals/Milestones Channels
**File:** `app/(main)/goals/page.tsx`

**Current:**
- `goals-changes` - no space_id in name
- `milestones-changes` - no space_id, table lacks column

**Impact:** All users receive all milestone changes, filtered in callback

### Issue 3: Chore Realtime No Batching
**File:** `hooks/useChoreRealtime.ts`

**Current:** Direct state updates on every change, inline sorts

**Fix:** Implement 50ms debounce batching like useTaskRealtime

### Issue 4: Projects Full Reload
**File:** `app/(main)/projects/page.tsx`
**Lines:** 153-228

**Current:** Any change triggers `loadData()` (full reload)

**Fix:** Incremental updates (add/update/remove from state)

## Well-Implemented Hooks

### useTaskRealtime
**File:** `hooks/useTaskRealtime.ts` (357 lines)

Features:
- Batching with 50ms debounce
- Memoized filters
- 12-second emergency timeout
- 15-minute periodic access verification
- Proper cleanup

### useRemindersRealtime
Similar excellent implementation to useTaskRealtime

### useCalendarRealtime
**File:** `lib/hooks/useCalendarRealtime.ts`

Features:
- Presence tracking
- Broadcast for editing notifications
- Proper cleanup

---

# AUTHENTICATION & SESSION ANALYSIS

## Middleware Issues

### Issue 1: Admin RPC Every Request
**File:** `middleware.ts`
**Lines:** 119-157

**Current:** `supabase.rpc('get_admin_details')` on EVERY admin request

**Fix:** Store admin status in encrypted httpOnly cookie (10 min TTL)

### Issue 2: Beta Validation Every Request
**File:** `middleware.ts`
**Lines:** 220-259

**Current:** `is_beta_access_valid()` RPC on EVERY protected request

**Fix:** Store beta status in encrypted cookie (1 hour TTL)

### Issue 3: No Caching of Session
**Line:** 80

**Current:** `getSession()` fresh on every request

## Auth Hook Issues

### Issue 1: Sequential Loading
**File:** `lib/hooks/useAuthQuery.ts`
**Lines:** 115-150

**Current:** Profile query waits for session query

```typescript
const sessionQuery = useAuthSession();      // 1st
const profileQuery = useUserProfile(...);   // 2nd (waits)
```

**Fix:** Parallel loading with Promise.all

### Issue 2: Aggressive Refetch
**File:** `lib/react-query/query-client.ts`
**Lines:** 33-35

**Current:** `refetchOnMount: 'always'`

**Fix:** `refetchOnMount: 'stale'`

### Issue 3: Emergency Timeout Workaround
**File:** `lib/hooks/useAuthWithSpaces.tsx`
**Lines:** 67-78

**Current:** 15-second emergency timeout is a workaround for broken loading

**Fix:** Debug and fix actual loading logic

## API Route Inconsistencies

**Pattern inconsistency:**
- Some routes use `getSession()` (heavier)
- Others use `getUser()` (lighter)

**Duplicate calls in:**
- `app/api/user/cancel-deletion/route.ts`
- `app/api/user/profile/route.ts`
- `app/api/user/privacy-settings/route.ts`

---

# PAGE-LEVEL PERFORMANCE ANALYSIS

## Dashboard Page
**File:** `app/(main)/dashboard/page.tsx`

**Issues:**
- Loads all 8+ feature categories before rendering
- Potential 10+ API calls blocking render
- No skeleton screens during load

**Fix:** Load top 3 first, defer rest with Suspense

## Tasks Page
**File:** `app/(main)/tasks/page.tsx`

**Issues:**
- Lines 228-263: Waterfall shopping list fetching
- Lines 50-57: Scattered loading states
- Lines 87-113: Duplicate real-time subscriptions (tasks + chores)

## Messages Page
**File:** `app/(main)/messages/page.tsx`

**Issues:**
- Lines 56-87: 32 useState declarations
- Multiple refs that could be consolidated
- No pagination for message history

## Meals Page
**File:** `app/(main)/meals/page.tsx`

**Issues:**
- Lines 162-188: 6 different modal-related states
- Line 366-368: `pendingDeletions` in dependency array causes subscription recreation

## Goals Page
**File:** `app/(main)/goals/page.tsx`

**Issues:**
- Lines 80-107: 28 useState declarations
- Lines 22-44: Multiple dynamicImport calls

## State Management Pattern

**Current anti-pattern:**
```typescript
const [loading, setLoading] = useState(true);
const [choreLoading, setChoreLoading] = useState(false);
const [itemLoadingStates, setItemLoadingStates] = useState({});
```

**Recommended:**
```typescript
const [loadingState, dispatch] = useReducer(loadingReducer, {
  initial: true,
  chores: false,
  items: {}
});
```

---

# COMPONENT OPTIMIZATION ANALYSIS

## Memoization Status

| Component | Memoized | Lines | Priority |
|-----------|----------|-------|----------|
| TaskCard | Yes | - | - |
| BetaFeedbackPanel | Yes | - | - |
| TwoWeekCalendarView | Yes | - | - |
| CalendarConnections | NO | 1,342 | HIGH |
| UnifiedItemModal | NO | 922 | HIGH |
| NewEventModal | NO | 857 | HIGH |
| NotificationSettings | NO | 848 | HIGH |
| YearInReviewDashboard | NO | 752 | HIGH |

## Index-Based Keys (21 instances)

**Files to fix:**
1. `components/calendar/EventProposalModal.tsx`
2. `components/shopping/NewShoppingListModal.tsx`
3. `components/calendar/MiniCalendar.tsx` (multiple)
4. `components/year-in-review/YearInReviewDashboard.tsx`
5. `components/meals/NewMealModal.tsx`
6. `components/beta/BetaFeedbackPanel.tsx`

**Current:** `key={index}`
**Fix:** `key={item.id}`

## Missing Memoization for Filters

**ConversationSidebar.tsx:**
```typescript
// Current - runs every render
const filtered = conversations.filter(...);

// Fix
const filtered = useMemo(() => conversations.filter(...), [conversations, query]);
```

**TaskFilterPanel.tsx:** Lines 47-61 - same issue

## Chained Map/Filter
**File:** `components/meals/NewMealModal.tsx`

**Current:**
```typescript
const cuisines = recipes.map(r => r.cuisine_type).filter(Boolean);
const difficulties = recipes.map(r => r.difficulty).filter(Boolean);
```

**Fix:** Single reduce pass

---

# THIRD-PARTY INTEGRATIONS ANALYSIS

## Stripe

### Webhook Email Sync Issue
**File:** `lib/stripe/webhooks.ts`
**Lines:** 210-223, 384-412

**Current:** Synchronous email sending blocks webhook response

**Fix:** Queue emails async, return immediately

### Missing Subscription Cache
**File:** `lib/services/subscription-service.ts`
**Lines:** 95-141

**Fix:** 5-minute Redis cache for user subscription

### Invoice List No Cache
**File:** `app/api/stripe/invoices/route.ts`
**Lines:** 58-61

**Fix:** Cache for 30 minutes

## Calendar Integrations

### Google Calendar Token Overhead
**File:** `lib/services/calendar/google-calendar-service.ts`
**Lines:** 49-99

**Current:** 2 separate RPC calls for access + refresh tokens

**Fix:** Single RPC returning both

### Outlook Missing Operations
**File:** `lib/services/calendar/outlook-calendar-service.ts`
**Lines:** 718, 722

**Current:** TODO placeholders for create/update

**Fix:** Implement batch upsert

## Email Service

### Sequential Processing
**File:** `lib/services/email-service.ts`
**Lines:** 715-773

**Current:** Sequential with 100ms delay (100 emails = 10+ seconds)

**Fix:** Parallel with concurrency limit (10)

## Gemini AI

### No Response Cache
**File:** `lib/services/gemini-service.ts`
**Lines:** 73-92

**Fix:** Cache 24 hours by user/date

### No Timeout
**Fix:** 30-second timeout with fallback

## Daily Digest Job

### Sequential Everything
**File:** `lib/jobs/daily-digest-job.ts`
**Lines:** 93-224

**Current:**
```
100 users × (4 DB queries + 1 AI call + 1 email + 100ms delay)
= 5-10 minutes
```

**Fix:**
```
1. Single query for all users (JOIN)
2. Batch AI (10 parallel)
3. Batch email (10 parallel)
= 30-60 seconds
```

---

# FORMS & USER INTERACTIONS ANALYSIS

## Search Without Debounce (10+ instances)

**Files affected:**
1. `components/documentation/SearchBar.tsx:194-198`
2. `components/messages/ConversationSidebar.tsx:34`
3. `components/goals/TemplateSelectionModal.tsx:27`
4. `components/tasks/TemplatePickerModal.tsx`
5. `components/tasks/DependenciesModal.tsx`
6. `components/messages/ForwardMessageModal.tsx:24,55-59`
7. `components/expenses/RecurringPatternsList.tsx`
8. `components/achievements/BadgeGallery.tsx`
9. `components/expenses/ReceiptLibrary.tsx`
10. `components/admin/panels/UsersPanel.tsx`

**Impact:** Full list re-render on every keystroke

**Fix:**
```typescript
import { useDebouncedValue } from 'use-debounce';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
```

## Form Re-renders

**Files with spread-update pattern:**
1. `components/projects/NewExpenseModal.tsx:62,135,254`
2. `components/household/NewExpenseModal.tsx`
3. `components/household/NewChoreModal.tsx`
4. `components/meals/NewMealModal.tsx`
5. `components/beta/FeedbackForm.tsx:131,154`

**Current:**
```typescript
onChange={(e) => setFormData({ ...formData, title: e.target.value })}
```

**Fix:** Separate state or useReducer

## Well-Implemented Patterns

- Modal focus management (Modal.tsx)
- DateTimePicker portal rendering
- Drag and drop touch handling
- Button loading states
- VirtualizedList component

---

# COMPREHENSIVE TODO LIST

## Legend
- **CRITICAL** - Security/Data integrity issues
- **HIGH** - Major performance impact
- **MEDIUM** - Noticeable improvement
- **LOW** - Polish/enhancement

---

## SECTION 1: DATABASE & QUERIES

### 1.1 N+1 Query Fixes

#### CRITICAL 1.1.1 Messages Unread Count N+1 (30min)
- **File:** `lib/services/messages-service.ts`
- **Lines:** 882-896
- **Task:** Create `get_unread_counts_by_conversation` RPC function
- **SQL:**
```sql
CREATE OR REPLACE FUNCTION get_unread_counts_by_conversation(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
  SELECT conversation_id, COUNT(*) as unread_count
  FROM messages
  WHERE read = false AND sender_id != p_user_id
  GROUP BY conversation_id
$$ LANGUAGE SQL STABLE;
```
- **Then:** Replace Promise.all loop with single RPC call

#### CRITICAL 1.1.2 Activity Feed 11 Parallel Queries (1hr)
- **File:** `lib/services/activity-feed-service.ts`
- **Lines:** 28-40
- **Task:** Create unified `get_recent_activity(space_id, limit)` RPC
- **Implementation:** UNION ALL query combining all 11 tables

#### HIGH 1.1.3 Task Creation Notification Queries (20min)
- **File:** `lib/services/tasks-service.ts`
- **Lines:** 302-335
- **Task:** Cache user/space names in Redis
- **Implementation:**
  - Add `cacheAside('user:name:${id}', fetchUserName, CACHE_TTL.LONG)`
  - Add `cacheAside('space:name:${id}', fetchSpaceName, CACHE_TTL.LONG)`

### 1.2 Query Optimization

#### HIGH 1.2.1 Task Stats JavaScript Aggregation (30min)
- **File:** `lib/services/tasks-service.ts`
- **Lines:** 536-580
- **Task:** Create SQL aggregation function `get_task_stats`

#### HIGH 1.2.2 Shopping List Waterfall (45min)
- **File:** `app/(main)/tasks/page.tsx`
- **Lines:** 228-263
- **Task:** Create batch endpoint `/api/tasks/shopping-links`
- **Accept:** Array of task IDs
- **Return:** Map of task_id → shopping_lists

#### MEDIUM 1.2.3 Spending Insights Loops (20min)
- **File:** `lib/services/spending-insights-service.ts`
- **Lines:** 91, 159
- **Task:** Use single reduce() or SQL aggregation

### 1.3 HTTP Caching Headers

#### HIGH 1.3.1 Add Cache-Control to GET Routes (1hr)
- **Files to update:**
  - `app/api/tasks/route.ts`
  - `app/api/shopping/route.ts`
  - `app/api/calendar/route.ts`
  - `app/api/meals/route.ts`
  - `app/api/reminders/route.ts`
  - `app/api/goals/route.ts`
  - `app/api/messages/route.ts`
  - `app/api/expenses/route.ts`
  - `app/api/projects/route.ts`
  - `app/api/chores/route.ts`
- **Add:** `'Cache-Control': 'private, max-age=60'`

#### MEDIUM 1.3.2 Add ETag Support (30min)
- **Files:** Same as above
- **Task:** Generate ETag from data hash, return 304 if unchanged

### 1.4 Redis Caching Gaps

#### HIGH 1.4.1 Cache Activity Feed (20min)
- **File:** `lib/services/activity-feed-service.ts`
- **Key:** `activity:${spaceId}`
- **TTL:** 5 minutes

#### MEDIUM 1.4.2 Cache Conversation Lists (20min)
- **File:** `lib/services/messages-service.ts`
- **Key:** `conversations:${userId}`
- **TTL:** 2 minutes

#### MEDIUM 1.4.3 Cache Goal Statistics (15min)
- **File:** `lib/services/goals-service.ts`
- **Key:** `goal:stats:${spaceId}`
- **TTL:** 5 minutes

### 1.5 Database Indexes

#### MEDIUM 1.5.1 Verify/Add Missing Indexes (30min)
- **Task:** Create migration with indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_space_status ON tasks(space_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_space_due ON tasks(space_id, due_date);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_goals_space_status ON goals(space_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_space_due ON reminders(space_id, due_date);
```

#### LOW 1.5.2 Add space_id to goal_milestones (20min)
- **Task:** Migration to add column, backfill, add RLS

---

## SECTION 2: REAL-TIME SUBSCRIPTIONS

### 2.1 Channel Filtering

#### CRITICAL 2.1.1 Dashboard Channels Space Filter (30min)
- **File:** `app/(main)/dashboard/page.tsx`
- **Task:** Change all 10 channels from `dashboard_*` to `dashboard_*:${spaceId}`

#### HIGH 2.1.2 Goals Channel Space Filter (10min)
- **File:** `app/(main)/goals/page.tsx`
- **Line:** 195
- **Change:** `.channel('goals-changes')` → `.channel(\`goals-changes:\${currentSpace.id}\`)`

#### HIGH 2.1.3 Milestones Filtering (15min)
- **File:** `app/(main)/goals/page.tsx`
- **Task:** Keep client-side filtering (table lacks space_id)
- **Long-term:** See 1.5.2

### 2.2 Subscription Optimization

#### HIGH 2.2.1 Add Batching to useChoreRealtime (45min)
- **File:** `hooks/useChoreRealtime.ts`
- **Task:** Implement batching like useTaskRealtime
- **Add:**
  - `updateQueueRef` for batching
  - 50ms debounce
  - Batch processing function

#### HIGH 2.2.2 Projects Incremental Updates (30min)
- **File:** `app/(main)/projects/page.tsx`
- **Lines:** 153-228
- **Task:** Replace `loadData()` with incremental state updates

#### MEDIUM 2.2.3 Optimize Secondary Hooks (30min)
- **File:** `hooks/useTaskRealtime.ts`
- **Lines:** 339-456
- **Task:** Process individual updates for subtasks/comments

#### MEDIUM 2.2.4 Fix Meals Subscription Recreation (15min)
- **File:** `app/(main)/meals/page.tsx`
- **Lines:** 366-368
- **Task:** Use useRef for pendingDeletions instead of state in deps

---

## SECTION 3: AUTHENTICATION & SESSION

### 3.1 Middleware Optimization

#### CRITICAL 3.1.1 Cache Admin Session (45min)
- **File:** `middleware.ts`
- **Lines:** 119-157
- **Task:** Store admin status in encrypted httpOnly cookie
- **TTL:** 10 minutes
- **Invalidate:** On logout

#### CRITICAL 3.1.2 Cache Beta Status (30min)
- **File:** `middleware.ts`
- **Lines:** 220-259
- **Task:** Store beta status in encrypted cookie
- **TTL:** 1 hour

#### HIGH 3.1.3 Skip Static Assets (15min)
- **File:** `middleware.ts`
- **Task:** Early return for `/_next/static`, `/images`, `/fonts`

### 3.2 Auth Hook Optimization

#### HIGH 3.2.1 Parallel Session + Profile (30min)
- **File:** `lib/hooks/useAuthQuery.ts`
- **Lines:** 115-150
- **Task:** Use Promise.all for parallel loading

#### HIGH 3.2.2 Change refetchOnMount (5min)
- **File:** `lib/react-query/query-client.ts`
- **Lines:** 33-35
- **Change:** `'always'` → `'stale'`

#### MEDIUM 3.2.3 Fix Emergency Timeout (45min)
- **File:** `lib/hooks/useAuthWithSpaces.tsx`
- **Lines:** 67-78
- **Task:** Debug and fix actual loading logic

#### MEDIUM 3.2.4 Differentiate Loading States (15min)
- **File:** `lib/hooks/useAuthQuery.ts`
- **Lines:** 120-121
- **Task:** Separate `isInitialLoading` from `isRefreshing`

### 3.3 API Route Consistency

#### MEDIUM 3.3.1 Standardize Auth Pattern (30min)
- **Task:** Document and enforce getUser() vs getSession() pattern

#### MEDIUM 3.3.2 Remove Duplicate Auth Calls (20min)
- **Files:**
  - `app/api/user/cancel-deletion/route.ts`
  - `app/api/user/profile/route.ts`
  - `app/api/user/privacy-settings/route.ts`

---

## SECTION 4: PAGE-LEVEL OPTIMIZATION

### 4.1 State Management

#### HIGH 4.1.1 Consolidate Messages State (45min)
- **File:** `app/(main)/messages/page.tsx`
- **Lines:** 56-87
- **Task:** Reduce 32 useState to 4-5 useReducer groups

#### HIGH 4.1.2 Consolidate Tasks State (30min)
- **File:** `app/(main)/tasks/page.tsx`
- **Lines:** 50-57
- **Task:** Single loading state object

#### MEDIUM 4.1.3 Consolidate Goals State (30min)
- **File:** `app/(main)/goals/page.tsx`
- **Lines:** 80-107
- **Task:** Reduce 28 useState

#### MEDIUM 4.1.4 Consolidate Meals Modal State (20min)
- **File:** `app/(main)/meals/page.tsx`
- **Lines:** 162-188
- **Task:** Single modalState object

### 4.2 Data Loading

#### HIGH 4.2.1 Dashboard Progressive Loading (1hr)
- **File:** `app/(main)/dashboard/page.tsx`
- **Task:**
  - Load top 3 categories first
  - Defer others with Suspense
  - Add skeleton screens

#### MEDIUM 4.2.2 Add Suspense Boundaries (45min)
- **Files:**
  - `app/(main)/dashboard/page.tsx`
  - `app/(main)/tasks/page.tsx`
  - `app/(main)/calendar/page.tsx`
  - `app/(main)/goals/page.tsx`
  - `app/(main)/messages/page.tsx`

#### MEDIUM 4.2.3 List Virtualization (1hr)
- **Files:**
  - `app/(main)/messages/page.tsx`
  - `app/(main)/tasks/page.tsx`
  - `app/(main)/shopping/page.tsx`
- **Task:** Use `VirtualizedList` from `lib/performance`

---

## SECTION 5: COMPONENT OPTIMIZATION

### 5.1 Memoization

#### HIGH 5.1.1 Memoize CalendarConnections (5min)
- **File:** `components/calendar/CalendarConnections.tsx`
- **Task:** Add `memo()` wrapper

#### HIGH 5.1.2 Memoize + Split UnifiedItemModal (1hr)
- **File:** `components/shared/UnifiedItemModal.tsx`
- **Task:**
  - Add `memo()` wrapper
  - Split into: ItemForm, ItemDetails, ItemActions, ItemAttachments

#### HIGH 5.1.3 Memoize NewEventModal (5min)
- **File:** `components/calendar/NewEventModal.tsx`

#### HIGH 5.1.4 Memoize NotificationSettings (5min)
- **File:** `components/settings/NotificationSettings.tsx`

#### HIGH 5.1.5 Dynamic Import YearInReviewDashboard (15min)
- **File:** `components/year-in-review/YearInReviewDashboard.tsx`
- **Task:** Move to dynamic import + memo

### 5.2 List Keys

#### MEDIUM 5.2.1 Fix Index-Based Keys (30min)
- **Files:** EventProposalModal, NewShoppingListModal, MiniCalendar, YearInReviewDashboard, NewMealModal, BetaFeedbackPanel
- **Task:** Change `key={index}` to `key={item.id}`

### 5.3 Filter Memoization

#### MEDIUM 5.3.1 Memoize Conversation Filter (10min)
- **File:** `components/messages/ConversationSidebar.tsx`

#### MEDIUM 5.3.2 Memoize Task Filter (10min)
- **File:** `components/tasks/TaskFilterPanel.tsx`

#### MEDIUM 5.3.3 Fix Chained Map/Filter (15min)
- **File:** `components/meals/NewMealModal.tsx`
- **Task:** Single reduce pass

---

## SECTION 6: SEARCH & FORMS

### 6.1 Search Debouncing

#### HIGH 6.1.1 Add Debounce to All Searches (45min)
- **Files (10+):**
  - `components/documentation/SearchBar.tsx`
  - `components/messages/ConversationSidebar.tsx`
  - `components/goals/TemplateSelectionModal.tsx`
  - `components/tasks/TemplatePickerModal.tsx`
  - `components/tasks/DependenciesModal.tsx`
  - `components/messages/ForwardMessageModal.tsx`
  - `components/expenses/RecurringPatternsList.tsx`
  - `components/achievements/BadgeGallery.tsx`
  - `components/expenses/ReceiptLibrary.tsx`
  - `components/admin/panels/UsersPanel.tsx`
- **Task:** Add 300ms debounce using `use-debounce`

### 6.2 Form Optimization

#### MEDIUM 6.2.1 Optimize Form Updates (30min)
- **Files:**
  - `components/projects/NewExpenseModal.tsx`
  - `components/household/NewExpenseModal.tsx`
  - `components/household/NewChoreModal.tsx`
  - `components/meals/NewMealModal.tsx`
  - `components/beta/FeedbackForm.tsx`
- **Task:** Separate state or useReducer

---

## SECTION 7: THIRD-PARTY INTEGRATIONS

### 7.1 Stripe

#### HIGH 7.1.1 Async Webhook Emails (30min)
- **File:** `lib/stripe/webhooks.ts`
- **Lines:** 210-223, 384-412
- **Task:** Queue emails, return immediately

#### MEDIUM 7.1.2 Cache Subscription Status (20min)
- **File:** `lib/services/subscription-service.ts`
- **Task:** 5-minute Redis cache

#### MEDIUM 7.1.3 Cache Invoice List (15min)
- **File:** `app/api/stripe/invoices/route.ts`
- **Task:** 30-minute cache

### 7.2 Calendar

#### HIGH 7.2.1 Batch Token Retrieval (30min)
- **File:** `lib/services/calendar/google-calendar-service.ts`
- **Task:** Single RPC for both tokens

#### HIGH 7.2.2 Implement Outlook Operations (1hr)
- **File:** `lib/services/calendar/outlook-calendar-service.ts`
- **Lines:** 718, 722
- **Task:** Implement create/update

#### MEDIUM 7.2.3 Token Refresh Debouncing (15min)
- **File:** `lib/services/calendar/google-calendar-service.ts`
- **Task:** Max 1 storage per minute

#### MEDIUM 7.2.4 Cursor-Based Pagination (30min)
- **File:** `lib/services/calendar/google-calendar-service.ts`
- **Task:** Streaming with configurable batch size

### 7.3 Email

#### HIGH 7.3.1 Parallel Batch Processing (30min)
- **File:** `lib/services/email-service.ts`
- **Lines:** 715-773
- **Task:** Parallel with concurrency 10, no delays

#### MEDIUM 7.3.2 Add Retry Logic (20min)
- **Task:** Exponential backoff (1s, 2s, 4s)

### 7.4 AI

#### MEDIUM 7.4.1 Cache Digest Responses (20min)
- **File:** `lib/services/gemini-service.ts`
- **Task:** 24-hour cache by user/date

#### MEDIUM 7.4.2 Add Request Timeout (10min)
- **Task:** 30-second timeout with fallback

#### MEDIUM 7.4.3 Remove Batch Delays (10min)
- **File:** `lib/services/gemini-service.ts`
- **Line:** 141
- **Task:** Remove 100ms delay

### 7.5 Weather

#### LOW 7.5.1 Cache User Location (10min)
- **File:** `lib/services/weather-cache-service.ts`
- **Task:** 24-hour cache

### 7.6 Sentry

#### MEDIUM 7.6.1 Dynamic Sampling (20min)
- **File:** `sentry.client.config.ts`
- **Task:** 50% errors, 5% success

#### LOW 7.6.2 Backend Filtering (15min)
- **File:** `sentry.server.config.ts`
- **Task:** Filter health/internal endpoints

---

## SECTION 8: DAILY JOBS

### 8.1 Daily Digest

#### CRITICAL 8.1.1 Batch Processing (1.5hr)
- **File:** `lib/jobs/daily-digest-job.ts`
- **Lines:** 93-224
- **Tasks:**
  1. Single query for all users with JOINs
  2. Batch AI generation (10 parallel)
  3. Batch email sending (10 parallel)
  4. Remove 100ms delays
- **Target:** 30-60 seconds for 100 users

---

## SECTION 9: ASSETS

### 9.1 Images

#### HIGH 9.1.1 Compress Logo (15min)
- **File:** `public/rowan-logo.png`
- **Tasks:**
  - Compress to ~80-100KB
  - Create WebP version
  - Create multiple sizes

#### MEDIUM 9.1.2 Replace Raw img Tags (15min)
- **Files:**
  - `components/shopping/DraggableItemsList.tsx`
  - `components/goals/GoalCard.tsx`
  - `components/meals/MealCard.tsx`
- **Task:** Use `AvatarImage` component

#### MEDIUM 9.1.3 Add Blur Placeholders (10min)
- **Files:**
  - `app/(pages)/pricing/page.tsx`
  - `app/security/page.tsx`
- **Task:** Add `placeholder="blur"`

---

## SECTION 10: MOBILE

### 10.1 Enhancements

#### LOW 10.1.1 Pull-to-Refresh (1hr)
- **Files:** dashboard, tasks, reminders, shopping, messages
- **Task:** Create PullToRefresh wrapper

#### LOW 10.1.2 Swipe Gestures (2hr)
- **Task:** Swipe left=delete, right=complete
- **Include:** Haptic feedback

#### LOW 10.1.3 PWA Splash Screens (30min)
- **Task:** Add iOS splash images

#### LOW 10.1.4 Slow Network Detection (30min)
- **File:** `components/ui/NetworkStatus.tsx`
- **Task:** Use NetworkInformation API

---

# IMPLEMENTATION PLAN

## Summary

| Priority | Count | Est. Time |
|----------|-------|-----------|
| CRITICAL | 6 | 4 hours |
| HIGH | 32 | 16 hours |
| MEDIUM | 30 | 12 hours |
| LOW | 10 | 6 hours |
| **TOTAL** | **78** | **~38 hours** |

## Week 1: Critical + Quick Wins
1. 1.1.1, 1.1.2 (N+1 fixes)
2. 2.1.1 (Dashboard channels)
3. 3.1.1, 3.1.2 (Middleware caching)
4. 5.1.1-5.1.5 (Component memoization)
5. 1.3.1 (HTTP headers)
6. 9.1.1 (Logo compression)

## Week 2: High Priority
1. 4.1.1, 4.1.2 (State consolidation)
2. 6.1.1 (Search debouncing)
3. 7.1.1, 7.2.1 (Third-party async)
4. 8.1.1 (Daily digest batch)
5. 2.2.1, 2.2.2 (Subscription optimization)

## Week 3: Medium Priority
1. Remaining subscription fixes
2. Auth optimization
3. Data loading improvements
4. Keys + filter memoization
5. Third-party caching

## Week 4: Polish
1. Remaining medium items
2. All low priority items
3. Mobile enhancements
4. Testing and verification

---

# METRICS TO TRACK

## Before/After Comparison

| Metric | Current | Target |
|--------|---------|--------|
| Dashboard load | ? | < 2s |
| Messages load | ? | < 1.5s |
| API response (avg) | ? | < 200ms |
| Bundle size | ? | -15% |
| Re-renders (dashboard) | ? | -50% |
| DB queries (activity feed) | 11 | 1 |
| DB queries (unread counts) | N+1 | 1 |

## Lighthouse Targets

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Performance | > 90 | > 70 |
| FCP | < 1.5s | < 2.5s |
| LCP | < 2.5s | < 4s |
| TBT | < 200ms | < 600ms |
| CLS | < 0.1 | < 0.25 |

---

*Generated by Claude Code - December 30, 2025*
