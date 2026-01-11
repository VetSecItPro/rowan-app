# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Rowan is a Next.js 15.4 household management app built with TypeScript, React 19, Supabase (PostgreSQL + Auth), and Tailwind CSS 4. It provides tasks, calendar, budgets, meals, messages, goals, and shopping features for households and teams.

**Development Philosophy:** Work slowly, safely, strategically, and comprehensively. Safety first - every change must be carefully implemented to avoid breaking existing functionality.

## Quick Commands

### Development Server
```bash
# Start dev server (use this command)
pkill -f "next" 2>/dev/null; rm -rf ".next 2" "node_modules 2" ".next 3" "node_modules 3" .next 2>/dev/null; PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH" npm run dev

# Nuclear option if server hangs >60s
pkill -f "next" 2>/dev/null; rm -rf .next node_modules package-lock.json && npm install && npm run dev
```

Expected: Ready in ~5s → first page compile 15-30s → http://localhost:3000

**HMR (Hot Module Replacement):** Don't restart server for file edits. Only restart when server crashes, after `npm install`, or after changing `next.config.mjs`/env vars.

### Build & Type Checking
```bash
npm run build                    # Build for production
npm run type-check              # TypeScript check without emitting files (tsc --noEmit)
npm run lint                    # ESLint (also: next lint)
```

### Testing
```bash
npm test                        # Run Playwright E2E tests (alias for test:e2e)
npm run test:e2e                # Run E2E tests in headless mode
npm run test:e2e:ui             # Run E2E tests with Playwright UI
npm run test:e2e:headed         # Run E2E tests in headed mode (see browser)
npm run test:e2e:debug          # Debug E2E tests with Playwright inspector
npm run test:e2e:chromium       # Run tests only in Chromium
npm run test:e2e:report         # Show HTML test report
```

Tests located in: `tests/e2e/`
Config: `playwright.config.ts`

### Database Scripts
```bash
npm run validate-db             # Validate database schema and integrity
npm run check-db-advisors       # Check database advisors
npm run fix-db-advisors         # Fix database advisors
```

### Bundle Analysis
```bash
npm run analyze                 # Analyze bundle size (both server & browser)
npm run analyze:server          # Analyze server bundle
npm run analyze:browser         # Analyze browser bundle
```

## Architecture

### Directory Structure
```
rowan-app/
├── app/                        # Next.js App Router (routes, pages, API routes)
│   ├── (auth)/                # Auth routes (login, signup, etc.)
│   ├── (main)/                # Main app routes (protected, post-login)
│   ├── (pages)/               # Public pages (landing, legal, etc.)
│   ├── api/                   # API route handlers
│   ├── admin/                 # Admin dashboard
│   ├── features/              # Feature-specific routes
│   ├── layout.tsx             # Root layout with providers
│   └── page.tsx               # Home/landing page
├── components/                 # React components organized by feature
│   ├── tasks/                 # Task management components
│   ├── calendar/              # Calendar components
│   ├── budget/                # Budget components
│   ├── messages/              # Messaging components
│   ├── ui/                    # Reusable UI components
│   └── shared/                # Shared cross-feature components
├── lib/                        # Core utilities and business logic
│   ├── services/              # Service layer - ALL database operations
│   ├── contexts/              # React contexts (Auth, Spaces, Subscription)
│   ├── hooks/                 # Custom React hooks
│   ├── validations/           # Zod schemas for data validation
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   ├── supabase/              # Supabase client utilities
│   ├── types.ts               # Centralized type exports
│   └── logger.ts              # Logging utilities
├── tests/e2e/                 # End-to-end tests (Playwright)
├── scripts/                    # Utility scripts (database, admin, etc.)
└── docs/                       # Documentation
```

### Service Layer Architecture

**MANDATORY:** ALL database operations MUST go through `lib/services/`. Never make direct Supabase calls from components or API routes.

**Service Pattern:**
```typescript
// lib/services/example-service.ts
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export const exampleService = {
  async getData(spaceId: string) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('space_id', spaceId);
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error in getData', error, {
        component: 'exampleService',
        action: 'getData',
        spaceId,
      });
      throw error;
    }
  }
};
```

Key services: `tasks-service`, `calendar-service`, `budgets-service`, `messages-service`, `spaces-service`, `auth-service`

### Real-time Subscriptions Pattern

```typescript
useEffect(() => {
  const channel = supabase
    .channel('channel_name')
    .on('postgres_changes', { 
      filter: `space_id=eq.${spaceId}` 
    }, callback)
    .subscribe();
  
  // MANDATORY cleanup
  return () => supabase.removeChannel(channel);
}, [spaceId]);
```

### Authentication & Spaces Context

- **AuthContext** (`lib/contexts/auth-context.tsx`): User authentication state
- **SpacesContext** (`lib/contexts/spaces-context.tsx`): Active space management
- **SubscriptionContext** (`lib/contexts/subscription-context.tsx`): User subscription/tier

All data operations are scoped to `space_id` - this enforces multi-tenancy at the database level.

### Database Security (Row Level Security - RLS)

All tables have RLS policies that enforce:
- User authentication (`auth.uid()` must match resource owner)
- Space isolation (all queries filtered by `space_id`)
- Role-based access (owner/admin/member permissions)

**Never bypass RLS** - use the anon key client in services, not service_role key.

### Type System

Central type exports in `lib/types.ts`. Use existing interfaces - do not create duplicate types.

Key types:
- `User`, `Space`, `SpaceMember`
- `Task`, `Event`, `Reminder`, `Message`
- `Budget`, `Expense`, `Bill`
- `Recipe`, `MealPlan`, `ShoppingList`
- `Goal`, `Chore`, `DailyCheckin`

Enums: `TaskStatus`, `TaskPriority`, `SpaceMemberRole`, `GoalStatus`, `BudgetPeriod`, etc.

### API Routes

Located in `app/api/`. Common endpoints:
- `api/tasks`, `api/calendar`, `api/budgets`
- `api/messages`, `api/shopping`, `api/meals`
- `api/auth`, `api/spaces`, `api/invitations`
- `api/admin` (admin-only operations)

**Security on all API routes:**
- Rate limiting (Upstash Redis)
- Input validation (Zod schemas)
- Authentication checks
- Space membership verification

### Component Patterns

**PortalDropdown Component** (`components/ui/Dropdown.tsx`):
Use for any dropdown positioning issues in modals. Portal-based rendering prevents clipping by parent containers.

```tsx
import { Dropdown } from '@/components/ui/Dropdown';

<Dropdown
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  placeholder="Select option..."
/>
```

## Tech Stack

### Core
- **Next.js:** 15.4.10 (App Router) - NOT 15.5.x (has race conditions)
- **Node.js:** 20.19.6 LTS (via nvm) - NOT 22 (has race conditions)
- **React:** 19.0.0
- **TypeScript:** 5 (strict mode enabled)

### Database & Auth
- **Supabase:** PostgreSQL + Authentication + Row Level Security
  - `@supabase/supabase-js ^2.58.0`
  - `@supabase/ssr ^0.8.0`

### Styling
- **Tailwind CSS:** 4.0 (utility-first)
- **Framer Motion:** 12 (animations)
- **Lucide React:** Icons

### Backend Services
- **Upstash Redis:** Rate limiting & caching
- **Resend:** Transactional email
- **Stripe:** Payments (v20)
- **Sentry:** Error tracking (v10)

### Data & Validation
- **Zod:** 4 (schema validation)
- **date-fns:** 4 (date utilities)
- **Sonner:** Toast notifications

## Git Workflow & Deployment

### CRITICAL: Branching Strategy
**NEVER commit directly to main.** Always use feature branches.

```bash
# 1. Create feature branch
git checkout -b feature/description

# 2. Push branch
git push -u origin feature/description

# 3. Work and commit on feature branch
git add .
git commit -m "feat(scope): description"
git push

# 4. Before PR: Test locally
npm run build && npx tsc --noEmit

# 5. Create PR
gh pr create --title "Title" --body "Description"

# 6. GitHub Actions automatically creates preview deployment

# 7. After approval: Merge via GitHub UI
# GitHub Actions automatically deploys to production

# 8. AFTER MERGE - Delete local branch
git checkout main
git pull origin main
git branch -d feature/description
```

**Branch naming:**
- `feature/task-improvements` - new features
- `fix/authentication-bug` - bug fixes
- `refactor/service-layer` - code refactoring
- `experiment/ui-redesign` - experimental changes

**Commit format:** `type(scope): description`
Types: feat, fix, docs, style, refactor, test, chore

### Automated CI/CD Pipeline

**On PR Creation:**
- GitHub Actions runs type checks, linting
- Deploys to Vercel preview environment
- Posts preview URL in PR comments
- Runs E2E tests

**On PR Merge to Main:**
- GitHub Actions runs database migrations
- Runs type checks and build
- Deploys to production (Vercel)
- Notifies on deployment status

**Pre-approved operations (no permission needed):**
- Git commits and pushes on feature branches
- Pull request creation and merging
- All GitHub Actions operations
- Security audits and code reviews
- Running commands during development

### Branch Cleanup

**MANDATORY after every PR merge:**
```bash
git checkout main
git pull origin main
git branch -d feature/your-branch   # Delete local branch
```

GitHub auto-deletes remote branches on merge (enabled in settings).

**Before merging any old branch:**
```bash
# Check how far behind main
git rev-list --count feature/branch..main

# Check what would be deleted
git diff main..feature/branch --stat

# If branch deletes files that exist in main = DO NOT MERGE (stale)
```

## Code Quality Standards

### TypeScript
- No `any` types
- Use interfaces from `lib/types.ts`
- `strict: true` in tsconfig.json

### Naming Conventions
- camelCase: variables, functions
- PascalCase: components, types, interfaces
- UPPER_SNAKE_CASE: constants
- Files: PascalCase (components), camelCase (utils), kebab-case (routes)

### Error Handling Pattern
```typescript
try {
  const validated = Schema.parse(data);
  const { data: result, error } = await supabase...
  if (error) throw error;
  return { success: true, data: result };
} catch (error) {
  logger.error('Error:', error, { component, action });
  return { success: false, error: 'User-friendly message' };
}
```

### Security Checklist
- Never bypass RLS policies
- No service_role key on client
- Always validate `auth.uid()` matches resource owner
- ALL queries filtered by `space_id`
- Validate all input with Zod schemas
- Sanitize HTML with DOMPurify
- Rate limit all API routes
- Never use `dangerouslySetInnerHTML` without sanitization
- No API keys in client code (`NEXT_PUBLIC_*` = client-safe)
- Never commit `.env.local`

### UI/UX Requirements
- Loading states for all async operations
- Empty states for list views
- Dark mode: `dark:` variants on all colors
- Error messages: user-friendly, no technical details
- Mobile responsive (test all viewports)

### Feature Colors
```typescript
const COLORS = {
  tasks: 'blue',
  calendar: 'purple',
  reminders: 'pink',
  messages: 'green',
  shopping: 'emerald',
  meals: 'orange',
  household: 'amber',
  goals: 'indigo'
};
```

## MCP Configuration

### Supabase MCP - ROWAN APP DATABASE
**Project:** `mhqpjprmpvigmwcghpzx`
**URL:** `https://mhqpjprmpvigmwcghpzx.supabase.co`

**Correct `.mcp.json`:**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=mhqpjprmpvigmwcghpzx"
    }
  }
}
```

**Rowan Tables:**
- Core: `spaces`, `space_members`, `users`
- Features: `tasks`, `events`, `reminders`, `messages`
- Shopping: `shopping_lists`, `shopping_items`
- Meals: `recipes`, `meal_plans`, `meals`
- Budget: `budgets`, `budget_categories`, `expenses`, `bills`
- Household: `chores`, `goals`, `daily_checkins`

## Common Pitfalls to Avoid

- ❌ Committing directly to main → ✅ Always use feature branches
- ❌ Direct Supabase calls in components → ✅ Use service layer
- ❌ Missing subscription cleanup → ✅ Return cleanup in useEffect
- ❌ Hardcoded IDs → ✅ From context/session
- ❌ No input validation → ✅ Zod schemas
- ❌ Missing `space_id` filter → ✅ Always filter by space
- ❌ `any` types → ✅ Proper interfaces
- ❌ Missing loading/empty states → ✅ Always include
- ❌ Skipping build/type tests before PR → ✅ Always test before PR

## Pre-commit Checklist

Before creating a PR:
- [ ] Working on feature branch (not main)
- [ ] Build passes: `npm run build`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] RLS policies on new tables
- [ ] Zod validation for inputs
- [ ] Rate limiting on new API routes
- [ ] Space data isolation (`space_id` filters)
- [ ] No `console.log` in production code
- [ ] Real-time cleanup implemented
- [ ] Dark mode tested
- [ ] Mobile responsive
- [ ] PR has proper title/description

## Environment Variables

- `NEXT_PUBLIC_*` = client-safe (exposed to browser)
- No `NEXT_PUBLIC_` prefix = server-only
- Never commit `.env.local`
- Use environment variables for all secrets
- Store secrets in Vercel environment variables for production

## Troubleshooting

### Dev Server Issues
- **Hangs >60s:** Use nuclear option (see Quick Commands)
- **500 in browser:** Hard refresh (Cmd+Shift+R)
- **Port 3000 in use:** Already handled by dev command (pkill)
- **npm not found:** Use full PATH in dev command

### Build Issues
- **TypeScript errors:** Run `npx tsc --noEmit` to see details
- **ESLint circular structure:** Run `npm run lint` separately (not during build)

### Database Issues
- **RLS errors:** Check user is authenticated and has space access
- **Wrong tables returned:** Verify MCP is connected to correct Supabase project

## Additional Documentation

- `DEV-SERVER.md` - Detailed dev server troubleshooting
- `CLAUDE.md` - Comprehensive development standards (full reference)
- `docs/` - Additional architecture and planning docs
