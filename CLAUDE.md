# Rowan Development Standards

> **CRITICAL**: All code must be correct on first attempt. Security is foundational.

> **CRITICAL - GIT WORKFLOW**: NEVER push or commit code to GitHub unless explicitly instructed by the user. You may suggest committing or pushing, but NEVER execute git commit, git push, or any GitHub operations without explicit user approval. GitHub Actions workflows have costs - work on features and fixes locally, validate on localhost first, then push to GitHub only when the user says so.

---

## Project Status (Jan 2026)

### What Rowan Is
Family/household management app - tasks, chores, meals, budgets, goals, calendar, shopping lists, rewards system. Multi-space architecture (one family = one space).

### Completed ✅
- **Core Features**: All household management features functional
- **Dark Mode Only**: Entire codebase cleaned (5,600+ patterns removed) - NO light mode
- **Native Mobile Ready**: Capacitor 8.x with 36 plugins for iOS/Android
- **Location Tracking**: Family location sharing with geofences, privacy controls
- **Push Notifications**: Native bridge ready, API routes, in-app notifications
- **Late Penalty System**: Chore penalties with forgiveness, progressive scaling
- **Database**: All migrations applied, RLS on all tables, security audited
- **Offline Support**: Full offline-first architecture (see details below)

### Offline & Low-Connectivity Support ✅
| Feature | Implementation |
|---------|----------------|
| **Service Worker v3** | App shell precaching, 3s timeout fallback to cache |
| **React Query Persistence** | Cache persists to IndexedDB, survives app close |
| **Network Detection** | Native bridge via @capacitor/network (wifi/4G/3G/2G) |
| **Offline Banner** | YouTube-style notifications (offline/back online/syncing) |
| **Connection Quality UI** | Badges and warnings for poor connectivity |
| **Offline Queue** | Actions queue locally, sync when reconnected |

Key files: `lib/native/network.ts`, `lib/react-query/offline-persistence.ts`, `hooks/useNetworkStatus.ts`, `components/ui/NetworkStatus.tsx`, `public/sw.js`

### Native Mobile Plugins (36 total)
All plugins installed upfront to minimize future App Store reviews:
- **Core**: app, app-launcher, cli, ios, android
- **Device**: camera, geolocation, haptics, keyboard, voice-recorder, screen-orientation
- **Notifications**: push-notifications, local-notifications
- **UI**: splash-screen, status-bar, dialog, toast, action-sheet, badge
- **Storage**: preferences, filesystem, clipboard, file-picker, secure-storage
- **Network**: network, share, browser
- **Platform**: device, screen-reader, contacts, apple-sign-in, calendar, native-settings
- **Security**: biometric-auth
- **App Store**: in-app-review, native-market
- **Background**: background-fetch

Native bridges: `lib/native/` (capacitor, push-notifications, geolocation, barcode, calendar, network)

### Push Notification Setup Status
| Item | Status |
|------|--------|
| Firebase project (`rowan-c8006`) | ✅ Created, FCM enabled |
| `google-services.json` (Android) | ✅ In `android/app/` (gitignored) |
| `GoogleService-Info.plist` (iOS) | ✅ In `ios/App/App/` (gitignored) |
| FCM HTTP v1 API | ✅ Upgraded from legacy API (PR #162) |
| VAPID keys (web push) | ✅ Configured in `.env.local` |
| Native push bridge code | ✅ `lib/native/push-notifications.ts` |
| `push_tokens` DB table + RLS | ✅ Ready |
| `android/` and `ios/` gitignored | ✅ Fixed (PR #162) |

### Remaining (Blocked on Developer Accounts)

> **Blocker**: Apple Developer account validation pending (created Jan 2026). Google Play account also pending. Need Android phone for testing.

**When Apple Developer account is approved:**
1. Go to [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new key, enable "Apple Push Notifications service (APNs)"
3. Download the `.p8` file (only downloadable once!)
4. Note the **Key ID** (10-char string) and your **Team ID** (from Membership page)
5. Go to [Firebase Console → Project Settings → Cloud Messaging](https://console.firebase.google.com/project/rowan-c8006/settings/cloudmessaging)
6. Under "Apple app configuration", upload the `.p8` key, enter Key ID and Team ID
7. Build and test on physical iOS device via Xcode (`npx cap open ios`)

**When Google Play account is approved:**
1. Build and test on physical Android device via Android Studio (`npx cap open android`)
2. Set up Google Play Console listing (app name, description, screenshots, icons)

**Server-side (do anytime — no account needed):**
1. Go to [Firebase Console → Project Settings → Service accounts](https://console.firebase.google.com/project/rowan-c8006/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key" → downloads JSON file
3. Set the entire JSON as `FIREBASE_SERVICE_ACCOUNT` env var in [Vercel dashboard](https://vercel.com) (single-line string)
4. Also set in `.env.local` for local testing

**Final steps after all accounts ready:**
1. `npx cap sync` — syncs web assets and native config
2. Test push notifications end-to-end on both platforms
3. Submit to App Store and Google Play

### Future Enhancements (Code Ready When Needed)
- Mutation queue integration with React Query (Phase 5)
- Request optimization for 2G/3G (Phase 6)
- Apple Watch / Android widgets (requires Swift/Kotlin)

### Architecture Notes
- **Capacitor**: Loads from Vercel URL (`server.url` in config) - instant updates without App Store
- **Offline-first**: Service worker caches app shell, React Query caches data to IndexedDB
- **Native folders**: `android/` and `ios/` are gitignored (generated, contain secrets)
- **Push tokens**: Stored in `push_tokens` table, per-user per-device

### Key Documentation
- `docs/rowan-mobile-app.md` - Native app implementation guide
- `docs/rowan-mobile-offline.md` - Offline support documentation

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

### Ongoing: Replace `select('*')` with specific columns

> **When working on any feature**, check its service file(s) in `lib/services/` for `.select('*')` on READ queries. Replace `'*'` with only the columns the callers actually use.

**Why:** Reduces API response size, lowers memory usage, enables Postgres covering indexes. Matters most on high-traffic services (messages, calendar, tasks, checkins, goals).

**How:**
1. Find `.select('*')` in the service file you're touching
2. Check the TypeScript interface and trace callers to see which columns are accessed
3. Replace `'*'` with the specific column list (e.g., `.select('id, title, status, created_at')`)
4. Skip write responses (`.insert().select('*')`, `.update().select('*')`) — those legitimately return the written row
5. Skip export/backup services — they need all columns by design
6. Run `tsc --noEmit` and **test the feature on localhost** — Supabase returns loosely typed data, so TypeScript won't catch a missing column

**Status:** 287 read queries remain across ~70 service files. See `rowan-optimize-feb26.md` item #5 for details.

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
| **Project Ref** | `mhqpjprmpvigmwcghpzx` |
| **Project URL** | `https://mhqpjprmpvigmwcghpzx.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/mhqpjprmpvigmwcghpzx |

**NEVER use any other project ref. If `get_project_url` returns a different URL, STOP and reconfigure.**

**Tables**: `spaces`, `space_members`, `users`, `tasks`, `events`, `reminders`, `messages`, `shopping_lists`, `shopping_items`, `recipes`, `meal_plans`, `meals`, `budgets`, `budget_categories`, `expenses`, `bills`, `chores`, `goals`, `daily_checkins`, `user_locations`, `family_places`, `location_sharing_settings`, `geofence_events`, `push_tokens`, `late_penalties`

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
claude mcp remove supabase -s project && claude mcp add supabase "https://mcp.supabase.com/mcp?project_ref=mhqpjprmpvigmwcghpzx" --transport http --scope project
```

### Vercel MCP
**Team**: VetSecItPro (`team_HFUTBVxI8jKYi334LvgVsVNh`) | **Project**: rowan-app (`prj_JDUhvutaUVWf0QXkBEe8axFVlWvE`)

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

## Build Notes

### lru-cache Import
`lru-cache` v11+ uses **named exports** (`import { LRUCache } from 'lru-cache'`), NOT default exports. Never use `import LRUCache from 'lru-cache'`.

### isomorphic-dompurify / jsdom
`isomorphic-dompurify` depends on `jsdom` which uses `fs.readFileSync` to load `default-stylesheet.css`. If webpack bundles it, the build fails with `ENOENT: default-stylesheet.css`. Fix: `serverExternalPackages: ['isomorphic-dompurify', 'jsdom']` in `next.config.mjs`.

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
