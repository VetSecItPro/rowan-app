# Claude Session Handoff Document
**Project:** Rowan App
**Last Updated:** 2025-10-10
**Purpose:** Comprehensive handoff document for continuing development across Claude sessions

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [User Working Preferences](#user-working-preferences)
3. [Architecture & Patterns](#architecture--patterns)
4. [Work Completed](#work-completed)
5. [Current State](#current-state)
6. [Known Issues](#known-issues)
7. [Remaining Work](#remaining-work)
8. [Quick Reference](#quick-reference)

---

## Project Overview

**Rowan** is a collaborative life management application for couples and families built with:
- **Stack:** Next.js 15, Supabase (Auth + Database), TypeScript, Tailwind CSS, next-themes
- **Features:** Tasks, Calendar, Reminders, Messages, Shopping Lists, Meal Planning, Household Management, Goals with Milestones
- **Security Model:** Partnership-based data isolation with Row Level Security (RLS)
- **Auth:** Supabase Auth with HTTP-only cookies, session persistence across dev server restarts

**Key Concepts:**
- **Spaces** (formerly partnerships): Each family/couple has a space, all data is scoped to `space_id`
- **RLS Policies:** Every table has policies enforcing space boundaries
- **Service Layer Pattern:** All database operations go through `lib/services/*-service.ts`
- **Real-time Subscriptions:** Supabase real-time for live updates across devices

---

## User Working Preferences

### Communication Style
- **Be concise and direct** - User prefers short responses without preamble/postamble
- **Show, don't explain** - Make changes first, brief confirmation after
- **No unnecessary elaboration** - Skip explanations unless specifically asked
- **Professional objectivity** - Prioritize technical accuracy over validation

### Workflow Preferences
1. **Pre-approved actions** - No need to ask permission for:
   - Git commits (use Conventional Commits format)
   - npm install/dev/build commands
   - File operations (create, move, rename, update)
   - Clearing cache (`rm -rf .next`)
   - Fixing imports and TypeScript errors

2. **Git workflow:**
   - Commit frequently with descriptive messages
   - Use format: `feat(scope): description` or `fix(scope): description`
   - Push to GitHub automatically (pre-approved)
   - If commit/push fails, keep trying until successful

3. **Development workflow:**
   - Use TodoWrite tool for complex multi-step tasks
   - Kill zombie dev servers aggressively (`killall -9 node`)
   - Clear `.next` and `node_modules/.cache` when needed
   - Always verify builds work before marking tasks complete

4. **Code quality:**
   - Follow CLAUDE.md standards religiously
   - Security-first approach (never bypass RLS, validate all input)
   - TypeScript strict mode (no `any` types)
   - Dark mode support required for all UI components

---

## Architecture & Patterns

### Service Layer Pattern (MANDATORY)
**Location:** `lib/services/`

**Pattern 1: Individual Function Exports** (Preferred)
```typescript
// lib/services/tasks-service.ts
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  space_id: z.string().uuid(),
});

export async function getTasks(spaceId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTask(data: z.infer<typeof TaskSchema>) {
  const supabase = createClient();
  const validated = TaskSchema.parse(data);
  const { data: task, error } = await supabase
    .from('tasks')
    .insert(validated)
    .select()
    .single();

  if (error) throw error;
  return task;
}
```

**Pattern 2: Object Export** (Alternative)
```typescript
// lib/services/example-service.ts
export const exampleService = {
  async getItems(spaceId: string) { /* ... */ },
  async createItem(data: CreateData) { /* ... */ },
  subscribeToItems(spaceId: string, callback: Function) { /* ... */ },
};
```

### Security Rules (NON-NEGOTIABLE)
1. **Never bypass RLS** - All queries respect Row Level Security
2. **No service_role key on client** - Server-only API routes can use service_role
3. **Always filter by space_id** - Every query must include space scope
4. **Validate all input** - Use Zod schemas for validation
5. **Rate limiting** - API routes must implement Upstash rate limiting

### Real-time Subscription Pattern
```typescript
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel('table_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `space_id=eq.${spaceId}`
    }, (payload) => {
      // Handle updates
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel); // MANDATORY cleanup
  };
}, [spaceId]);
```

### File Structure
```
app/
├── (auth)/              # Login, signup pages
├── (main)/              # Protected routes
│   ├── dashboard/       # Main dashboard
│   ├── tasks/           # Tasks feature
│   ├── calendar/        # Calendar feature
│   ├── goals/           # Goals with milestones
│   └── [...others]
components/
├── auth/                # Auth components
├── dashboard/           # Dashboard-specific
├── goals/               # Goals & milestones components
├── shared/              # Reusable components
└── layout/              # Layout components (Header, etc.)
lib/
├── services/            # Service layer (DB operations)
├── supabase/            # Supabase clients
├── types.ts             # TypeScript interfaces
└── utils.ts             # Utility functions
```

---

## Work Completed

### Core Features Implemented
1. **Authentication System**
   - Supabase Auth with email/password
   - Session persistence with HTTP-only cookies
   - Protected routes via middleware
   - Auto-redirect logic (logged-in users can't access /login)

2. **Dashboard** (`app/(main)/dashboard/page.tsx`)
   - Aggregates stats from all 8 features
   - Real-time updates
   - Trend calculations (week-over-week)
   - Stats cards with color-coded features
   - Loading and empty states

3. **Tasks Management**
   - Full CRUD operations
   - Priority levels (low, medium, high)
   - Assignment to space members
   - Due dates and status tracking
   - Real-time sync

4. **Calendar Events**
   - Event creation and management
   - Month/week/day views
   - Recurring events support
   - Personal vs shared events
   - Real-time updates

5. **Reminders**
   - One-time and recurring reminders
   - Priority levels
   - Status tracking (pending, completed, dismissed)
   - Real-time notifications

6. **Messages**
   - Thread-based messaging
   - Read/unread status
   - Real-time message delivery
   - Space member communication

7. **Shopping Lists**
   - Multiple lists per space
   - Item categories
   - Quantity tracking
   - Item checked/unchecked state

8. **Meal Planning**
   - Recipe management
   - Meal scheduling (breakfast, lunch, dinner)
   - Shopping list integration
   - Recipe ingredients

9. **Household Chores**
   - Chore assignment
   - Frequency tracking (daily, weekly, monthly)
   - Completion history
   - Stats by member

10. **Goals with Milestones** ⭐ RECENTLY ADDED
    - Goal creation with description and target dates
    - Milestone tracking (sub-tasks within goals)
    - Progress calculation based on completed milestones
    - Status tracking (in_progress, completed, on_hold, cancelled)
    - Real-time updates
    - Components:
      - `GoalCard.tsx` - Displays goal with progress bar
      - `NewGoalModal.tsx` - Create/edit goals
      - `MilestoneCard.tsx` - Display individual milestones
      - `NewMilestoneModal.tsx` - Add milestones to goals
    - Service: `lib/services/goals-service.ts`
    - Migration: `supabase/migrations/20251006000000_add_milestone_tracking.sql`

### Services Implemented
All in `lib/services/`:
- `tasks-service.ts`
- `calendar-service.ts`
- `reminders-service.ts`
- `messages-service.ts`
- `shopping-service.ts`
- `meals-service.ts`
- `chores-service.ts`
- `goals-service.ts` ⭐ (includes milestone functions)
- `projects-service.ts` (budget tracking)

### Database Schema
**Key Tables:**
- `users` - User profiles
- `spaces` (formerly partnerships) - Space information
- `space_members` - Join table for users in spaces
- `tasks`, `events`, `reminders`, `messages` - Core features
- `shopping_lists`, `shopping_items` - Shopping feature
- `meals`, `recipes`, `recipe_ingredients` - Meal planning
- `chores`, `chore_completions` - Household management
- `goals`, `milestones` ⭐ - Goals tracking
- `projects`, `budgets` - Budget management

**All tables have:**
- RLS policies enabled
- `space_id` foreign key (except users/spaces)
- Policies for SELECT, INSERT, UPDATE, DELETE based on space membership

---

## Current State

### What's Working ✅
- Authentication flow (login, signup, session persistence)
- All 8+ feature modules with CRUD operations
- Dashboard aggregating stats from all features
- Real-time subscriptions for all features
- Dark mode support across all pages
- Service layer pattern consistently applied
- TypeScript compilation passes
- Dev server runs cleanly on port 3000
- **Goals with milestone tracking fully functional**

### Recent Fixes Applied
1. **Dashboard `allProjects` Error** (Fixed 2025-10-10)
   - **Issue:** `ReferenceError: allProjects is not defined at page.tsx:491`
   - **Fix:** Added `allProjects` to Promise.all data fetching
   - **Files:** `app/(main)/dashboard/page.tsx` line 356 and 377

2. **Dev Server Zombie Processes** (Fixed 2025-10-10)
   - **Issue:** Multiple dev servers running on various ports
   - **Fix:** Aggressive process killing before restart
   - **Command:** `killall -9 node` + port cleanup

3. **Next.js Cache Corruption** (Fixed 2025-10-10)
   - **Issue:** Dashboard returning 500 error with webpack cache warnings
   - **Fix:** Removed `.next` and `node_modules/.cache` before restart

4. **Goals Milestone System** (Implemented 2025-10-06)
   - **Added:** Complete milestone tracking system
   - **Migration:** Created `milestones` table with `goal_id` FK
   - **Components:** MilestoneCard, NewMilestoneModal
   - **Service:** Extended goals-service with milestone functions

### Git Status (as of last check)
```
Current branch: main
Modified files:
  M app/(main)/goals/page.tsx
  M components/goals/GoalCard.tsx
  M components/goals/NewGoalModal.tsx
  M lib/services/goals-service.ts

Untracked files:
  ?? components/goals/MilestoneCard.tsx
  ?? components/goals/NewMilestoneModal.tsx
  ?? supabase/migrations/20251006000000_add_milestone_tracking.sql
```

**Action Required:** Commit these changes before starting new work.

---

## Known Issues

### High Priority
None currently identified. Dashboard error resolved, dev server stable.

### Medium Priority
1. **Zombie Dev Servers**
   - **Symptom:** Multiple `npm run dev` processes accumulate over time
   - **Workaround:** Run `killall -9 node` before starting new dev server
   - **Root Cause:** Improper shutdown of previous sessions
   - **Future Fix:** Add cleanup script or use process manager

2. **Type Safety in Dashboard**
   - **Issue:** Some service interfaces may not match actual return types
   - **Impact:** Potential runtime errors if data structure changes
   - **Fix:** Add runtime validation with Zod for service responses

### Low Priority
1. **Error Messages**
   - Some error messages could be more user-friendly
   - Consider adding error boundary components

2. **Loading States**
   - Some components could benefit from skeleton loaders
   - Current spinners work but could be more polished

3. **Mobile Responsiveness**
   - Most pages are responsive but could be optimized further
   - Test on actual mobile devices

---

## Remaining Work

### Must-Have Features
1. **Notifications System**
   - Push notifications for reminders
   - In-app notification center
   - Email notifications for important events
   - Service: `lib/services/notifications-service.ts`

2. **User Settings**
   - Profile editing (name, email, avatar)
   - Space settings (rename, invite members)
   - Notification preferences
   - Theme customization

3. **Invitation System**
   - Invite users to spaces via email
   - Accept/decline invitations
   - Invitation tokens with expiration
   - Email templates with Resend

4. **File Attachments**
   - Upload attachments to tasks, messages, recipes
   - Supabase Storage integration
   - File type validation and scanning
   - CDN for fast delivery

### Nice-to-Have Features
1. **Search & Filters**
   - Global search across all features
   - Advanced filtering (date ranges, status, assignee)
   - Search history
   - Saved searches

2. **Analytics & Reports**
   - Task completion rates over time
   - Chore distribution by member
   - Budget vs actual spending
   - Goal progress reports
   - Export to CSV/PDF

3. **Integrations**
   - Google Calendar sync
   - Todoist import
   - Notion integration
   - Slack notifications

4. **Mobile App**
   - React Native or Progressive Web App
   - Native push notifications
   - Offline mode with sync

5. **AI Features**
   - Smart task suggestions
   - Meal planning based on preferences
   - Budget forecasting
   - Natural language input for tasks/reminders

### Performance Optimizations
1. **Caching Layer**
   - Redis caching for frequently accessed data
   - Stale-while-revalidate pattern
   - Cache invalidation on updates

2. **Database Optimization**
   - Add indexes for common queries
   - Optimize RLS policies (can be slow)
   - Database connection pooling

3. **Code Splitting**
   - Lazy load feature modules
   - Reduce initial bundle size
   - Optimize images with next/image

### Testing & Quality
1. **Unit Tests**
   - Jest + React Testing Library
   - Test service layer functions
   - Test utility functions

2. **Integration Tests**
   - Test full feature flows
   - Test real-time subscriptions
   - Test authentication flows

3. **E2E Tests**
   - Playwright or Cypress
   - Test critical user journeys
   - Test across browsers

### DevOps & Deployment
1. **CI/CD Pipeline**
   - GitHub Actions for testing
   - Automated deployment to Vercel
   - Database migration checks

2. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring (Vercel Analytics)
   - Database monitoring (Supabase)

3. **Documentation**
   - API documentation
   - Component storybook
   - User guides

---

## Quick Reference

### Common Commands
```bash
# Start dev server
npm run dev

# Kill zombie servers
killall -9 node

# Clear cache and restart
rm -rf .next node_modules/.cache && npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Git workflow
git add .
git commit -m "feat(scope): description"
git push

# Database migrations
npx supabase db push
npx supabase migration list
```

### Environment Variables
```bash
# .env.local (never commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
RESEND_API_KEY=re_xxx...
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx...
```

### Feature Colors (for consistency)
```typescript
const FEATURE_COLORS = {
  tasks: 'bg-blue-500',
  calendar: 'bg-purple-500',
  reminders: 'bg-pink-500',
  messages: 'bg-green-500',
  shopping: 'bg-emerald-500',
  meals: 'bg-orange-500',
  household: 'bg-amber-500',
  goals: 'bg-indigo-500',
};
```

### Key Files to Reference
- **CLAUDE.md** - Project standards and conventions (READ THIS FIRST)
- **lib/types.ts** - TypeScript interfaces for all entities
- **middleware.ts** - Authentication and route protection logic
- **app/(main)/dashboard/page.tsx** - Example of complex data aggregation
- **lib/services/goals-service.ts** - Example of service pattern with relationships

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Port in use | `lsof -ti:3000 \| xargs kill -9` |
| Cache corruption | `rm -rf .next node_modules/.cache` |
| TypeScript errors | `npm run type-check` to identify |
| RLS policy blocking | Check `space_members` table has correct entries |
| Real-time not working | Verify subscription cleanup in useEffect |
| Session not persisting | Check `.env.local` has correct Supabase keys |

---

## Session Continuity Checklist

When starting a new Claude session:
1. ✅ Read this handoff document first
2. ✅ Read CLAUDE.md for coding standards
3. ✅ Check git status for uncommitted changes
4. ✅ Run `npm run type-check` to verify code compiles
5. ✅ Check if dev server is running (`lsof -ti:3000`)
6. ✅ Review "Known Issues" section for context
7. ✅ Check "Remaining Work" for prioritized tasks
8. ✅ Ask user what they want to work on next

---

**End of Handoff Document**

*This document should be updated after significant work is completed. Consider committing it to the repo for version control.*
