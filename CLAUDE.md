# Rowan Development Standards

> **CRITICAL**: All code must be correct on first attempt. Security is foundational.

> **CRITICAL - GIT WORKFLOW**: NEVER push or commit code to GitHub unless explicitly instructed by the user. You may suggest committing or pushing, but NEVER execute git commit, git push, or any GitHub operations without explicit user approval. GitHub Actions workflows have costs - work on features and fixes locally, validate on localhost first, then push to GitHub only when the user says so.

---

## Project Overview

Family/household management app - tasks, chores, meals, budgets, goals, calendar, shopping lists, rewards system. Multi-space architecture (one family = one space). Dark mode only.

## Stack

- **Next.js 15** (App Router), **React 19**, **TypeScript 5** (strict)
- **Supabase** - PostgreSQL + Auth + RLS
- **Tailwind CSS 4**, **Framer Motion 12**, **Lucide React**
- **Upstash Redis** (rate limiting), **Resend** (email), **Stripe** (payments)
- **Sentry** (errors), **DOMPurify** (XSS), **Zod** (validation), **date-fns**
- **Capacitor** (native mobile iOS/Android)

---

## Development Philosophy (MAIN MANDATE)

**Work slowly, safely, strategically, and comprehensively.**

**Work like a 10x senior developer and an expert Apple designer** - all code must be correct and the UI must be super elegant. Every interaction should feel polished, every animation purposeful, every layout pixel-perfect.

### Core Principles
1. **Safety First** - Every change must be implemented carefully to avoid breaking existing functionality elsewhere in the app
2. **No Band-Aid Fixes** - When troubleshooting, think around the whole problem. Understand root causes before implementing solutions
3. **Clean Code** - Push quality code that we can be proud of. Minimize technical debt at all times
4. **Comprehensive Thinking** - Consider the full impact of changes across the entire codebase before implementing
5. **Strategic Implementation** - Plan changes thoughtfully rather than rushing to implement

### Implementation Standards
- **Before writing code:** Understand how the change affects other parts of the app
- **Before fixing bugs:** Investigate the root cause, not just the symptom
- **Before refactoring:** Ensure all dependent code is identified and updated
- **Before merging:** Verify nothing is broken in related features

### Strategic Bug Fixing
When you discover a bug, search for all instances of the same pattern across the codebase and fix everywhere. The user should never have to say "did you check the other places too?"

## Development Server

> **Use `/dev` slash command** for details.

## Security Rules

- Never bypass RLS; no service_role key on client
- ALL queries filtered by `space_id`; RLS policies enforce space boundaries
- Validate all input with Zod; sanitize HTML with DOMPurify
- Rate limit all API routes; no API keys in client code
- `NEXT_PUBLIC_*` = client-safe; never commit `.env.local`

## Code Quality

- No `any` types; use interfaces from `lib/types.ts`
- camelCase (vars/functions), PascalCase (components/types), UPPER_SNAKE_CASE (constants)
- ALL database operations go through `lib/services/` (MANDATORY)
- Always cleanup real-time subscriptions in useEffect return

### Ongoing: Replace `select('*')` with specific columns

> **When working on any feature**, check its service file(s) in `lib/services/` for `.select('*')` on READ queries. Replace `'*'` with only the columns the callers actually use.

## UI/UX Requirements

### Dark Mode Only (GOVERNING PRINCIPLE)

> **CRITICAL**: Rowan is a **dark mode ONLY** application. There is NO light mode. This is a deliberate design decision.

- **No light mode support** - Do not add light mode variants or toggles
- **No `dark:` prefixes needed** - Since we're dark-only, just use dark colors directly
- **Background colors**: Use dark grays (`gray-900`, `gray-800`, `#0a0a0a`, etc.)
- **Text colors**: Use white and light grays for readability

### General UI/UX
- Loading states for async operations; empty states for lists
- **PortalDropdown** (`/components/ui/Dropdown.tsx`): Use for dropdown positioning issues in modals

## Git Workflow

**NEVER commit directly to main. Always use feature branches.**

> **Quick:** Use `/gh-feat` to auto-push, create branch, run CI, and monitor until green.

### Workflow
1. `git checkout -b feature/description` → `git push -u origin feature/description`
2. Work and commit on feature branch
3. Test: `pnpm build && pnpm type-check`
4. **ASK USER** before creating PR
5. **ASK USER** before merging to main
6. After merge: `git checkout main && git pull && git branch -d feature/branch`

**Branch names**: `feature/`, `fix/`, `refactor/`, `experiment/`
**Commit format**: `type(scope): description` (feat, fix, docs, style, refactor, test, chore)

## Feature Colors
```typescript
const COLORS = { tasks: 'blue', calendar: 'purple', reminders: 'pink', messages: 'green', shopping: 'emerald', meals: 'orange', household: 'amber', goals: 'indigo', location: 'cyan' };
```

## Build Notes

### lru-cache Import
`lru-cache` v11+ uses **named exports** (`import { LRUCache } from 'lru-cache'`), NOT default exports. Never use `import LRUCache from 'lru-cache'`.

### isomorphic-dompurify / jsdom
`isomorphic-dompurify` depends on `jsdom` which uses `fs.readFileSync` to load `default-stylesheet.css`. If webpack bundles it, the build fails with `ENOENT: default-stylesheet.css`. Fix: `serverExternalPackages: ['isomorphic-dompurify', 'jsdom']` in `next.config.mjs`.

## Common Mistakes
- No committing to main → Feature branches only
- No direct Supabase in components → Service layer
- No missing subscription cleanup → useEffect return
- No missing space_id filter → Always filter
- No `any` types → Proper interfaces
- No skipping build test before PR → Always test

## Review Checklist
- [ ] Feature branch (not main)
- [ ] Build passes: `pnpm build`
- [ ] Types pass: `pnpm type-check`
- [ ] RLS on new tables, Zod validation, rate limiting
- [ ] Space isolation, real-time cleanup
- [ ] Dark mode, mobile responsive
