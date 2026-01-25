# Rowan Development Standards

> **CRITICAL**: All code must be correct on first attempt. Security is foundational.

> **CRITICAL - GIT WORKFLOW**: NEVER push or commit code to GitHub unless explicitly instructed by the user. You may suggest committing or pushing, but NEVER execute git commit, git push, or any GitHub operations without explicit user approval. GitHub Actions workflows have costs - work on features and fixes locally, validate on localhost first, then push to GitHub only when the user says so.

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

## Stack

- **Next.js 15.4.10** (App Router), **React 19**, **TypeScript 5** (strict)
- **Node.js 20.x LTS** (use `nvm use 20`)
- **Supabase** - PostgreSQL + Auth + RLS (`@supabase/supabase-js ^2.58.0`, `@supabase/ssr ^0.8.0`)
- **Tailwind CSS 4**, **Framer Motion 12**, **Lucide React**
- **Upstash Redis** (rate limiting), **Resend 6** (email), **Stripe 20** (payments)
- **Sentry 10** (errors), **DOMPurify** (XSS), **Zod 4** (validation), **date-fns 4**

## Development Server

> **Use `/dev` slash command** or see [dev-server.md](docs/guides/dev-server.md) for details.

```bash
pkill -f "next" 2>/dev/null; rm -rf ".next 2" "node_modules 2" ".next 3" "node_modules 3" .next 2>/dev/null; PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH" npm run dev
```

**Expected:** Ready in ~5s → http://localhost:3000. HMR handles file edits - only restart after `npm install` or config changes.

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

## UI/UX Requirements

### Dark Mode Only (GOVERNING PRINCIPLE)

> **CRITICAL**: Rowan is a **dark mode ONLY** application. There is NO light mode. This is a deliberate design decision for elegance and simplicity.

- **No light mode support** - Do not add light mode variants or toggles
- **No `dark:` prefixes needed** - Since we're dark-only, just use dark colors directly
- **Single icon set** - No need for light/dark icon variants
- **Background colors**: Use dark grays (`gray-900`, `gray-800`, `#0a0a0a`, etc.)
- **Text colors**: Use white and light grays for readability
- **Mobile apps**: Splash screen and status bar are configured for dark mode
- **Do NOT add light mode** - If you see light mode code, remove it

### General UI/UX
- Loading states for async operations; empty states for lists
- **PortalDropdown** (`/components/ui/Dropdown.tsx`): Use for dropdown positioning issues in modals

## MCP Configuration

### Supabase MCP
> **CRITICAL - VERIFY BEFORE ANY DB OPERATIONS**: Always run `mcp__supabase__get_project_url` first to confirm you're connected to the correct project!

| Property | Value |
|----------|-------|
| **Project Ref** | `SUPABASE_PROJECT_REF` |
| **Project URL** | `https://SUPABASE_PROJECT_REF.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/SUPABASE_PROJECT_REF |

**NEVER use any other project ref. If `get_project_url` returns a different URL, STOP and reconfigure.**

**Tables**: `spaces`, `space_members`, `users`, `tasks`, `events`, `reminders`, `messages`, `shopping_lists`, `shopping_items`, `recipes`, `meal_plans`, `meals`, `budgets`, `budget_categories`, `expenses`, `bills`, `chores`, `goals`, `daily_checkins`

### Isolated Tables (DO NOT USE IN ROWAN)

> **WARNING**: The following tables exist in this Supabase project but are **NOT part of Rowan**. Do not query, join, or reference these tables when working on Rowan features.

| Table | Purpose | Access |
|-------|---------|--------|
| `sm_content` | Social media content tracking | Claude social media skills ONLY |

**Rules for `sm_content`:**
- ❌ NEVER create foreign keys to/from this table
- ❌ NEVER join with Rowan tables in queries
- ❌ NEVER reference in Rowan components or services
- ❌ NEVER include in Rowan migrations or schema changes
- ✅ Completely ignore when working on Rowan features

**If wrong project connected**: Run this command, then restart Claude Code:
```bash
claude mcp remove supabase -s project && claude mcp add supabase "https://mcp.supabase.com/mcp?project_ref=SUPABASE_PROJECT_REF" --transport http --scope project
```

### Vercel MCP
**Team**: VetSecItPro (`[REDACTED_TEAM_ID]`) | **Project**: rowan-app (`[REDACTED_PROJECT_ID]`)

## Git Workflow

**NEVER commit directly to main. Always use feature branches.**

> **Quick:** Use `/gh-feat` to auto-push, create branch, run CI, and monitor until green.

### Workflow
1. `git checkout -b feature/description` → `git push -u origin feature/description`
2. Work and commit on feature branch
3. Test: `npm run build && npx tsc --noEmit`
4. **ASK USER** before creating PR: `gh pr create --title "Title" --body "Description"`
5. GitHub Actions creates preview deployment
6. **ASK USER** before merging to main
7. After merge: `git checkout main && git pull && git branch -d feature/branch`

**Branch names**: `feature/`, `fix/`, `refactor/`, `experiment/`
**Commit format**: `type(scope): description` (feat, fix, docs, style, refactor, test, chore)

**Pre-approved (no permission needed)**: Git operations on feature branches, PR creation/merging, security audits, running commands during development.

**Branch cleanup**: Remote branches auto-delete on merge. Always delete local branch after merge. Before merging old branches, check `git rev-list --count branch..main` - if >10 commits behind, rebase or recreate.

## Feature Colors
```typescript
const COLORS = { tasks: 'blue', calendar: 'purple', reminders: 'pink', messages: 'green', shopping: 'emerald', meals: 'orange', household: 'amber', goals: 'indigo', location: 'cyan' };
```

## Common Mistakes
- ❌ Committing to main → ✅ Feature branches
- ❌ Direct Supabase in components → ✅ Service layer
- ❌ Missing subscription cleanup → ✅ useEffect return
- ❌ Missing space_id filter → ✅ Always filter
- ❌ `any` types → ✅ Proper interfaces
- ❌ Skip build test before PR → ✅ Always test

## Review Checklist
- [ ] Feature branch (not main)
- [ ] Build passes: `npm run build`
- [ ] Types pass: `npx tsc --noEmit`
- [ ] RLS on new tables, Zod validation, rate limiting
- [ ] Space isolation, real-time cleanup
- [ ] Dark mode, mobile responsive
