# Changelog

All notable changes to Rowan are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Removed
- **Late-penalty feature — fully retired** (#434) — the backend was live (penalties applied on chore completion) but its only UI was never wired to any route, so users couldn't configure or review penalties. Removed end to end: 3 API routes, the service, 2 UI components, 4 AI tools, the chore-completion integration, and 5 `Chore` type fields. Migration `20260607230000` drops `late_penalties` + 5 `chores` columns + `spaces.late_penalty_settings`. Also deleted the dedicated marketing blog article and scrubbed penalty mentions from 3 others (the feature no longer exists). The chore-completion route keeps its race-safe points award; `netPoints` is now just `pointsAwarded`.
- **6 orphan analytics functions** (#432) — `check_meal_plan_task_uniqueness` / `get_analytics_range` / `get_or_create_daily_analytics` / `get_yesterday_metrics` / `update_daily_active_users` / `get_unread_mentions` referenced tables dropped in the 2026-03-16 cleanup (`daily_analytics` / `meal_plan_tasks` / `reminder_mentions` / `beta_access_requests`). Not reachable via app/trigger/RPC, but were live-but-broken PostgREST endpoints. Migration `20260607000000` REVOKEs the grants then DROPs all 6 (idempotent).
- **14 dead-code files** (#433) — a read-only knip + import-trace audit over the post-launch feature-removal churn removed: `task-reminders-service.ts`, `lib/validations/recurring-expenses.ts` (superseded by the service), the 4 dead `components/household/*` chore/expense duplicates of the live `components/projects/*` twins (+ their tests), 3 unused barrels, and `lib/performance/index.ts`.

### Removed (drift reconciliation)
- **14 orphan public-schema functions** (Phase 9.2) — dropped via migration `20260508173921_drop_orphan_functions.sql`. Inventory script (`scripts/database/inventory-drift.ts`) found 14 functions with zero application code references AND zero `pg_trigger.tgfoid` references. Categories: trial helpers superseded by Polar app-side logic (3), admin helpers never wired up (2), space helpers superseded by direct flag reads (3), cron-style cleanup never scheduled (3), stats RPCs never called (3). All DROPs are idempotent (`IF EXISTS`) and reversible — bodies preserved in earlier migration files. Cross-reference findings preserved in `docs/security-audit/phase-9-drift-inventory.md`.

### Fixed
- **Apple / Outlook calendar sync — restored at root cause** (8 June) — external calendar sync had been broken since the 2026-03-18 cleanup, which dropped the `store_oauth_token` / `get_oauth_token` Vault functions (the credential flows threw "function does not exist"). Rebuilt both as Supabase Vault-backed (AES-256) SECURITY DEFINER functions (migration `20260608190000`) with **three root-cause fixes over the original**: (1) accept `app_specific_password` (Apple) — the original only allowed `access_token`/`refresh_token`, so Apple would have failed validation even before the drop; (2) an **internal space-membership ownership check** so the user-context service calls work *and* a user can't read another space's decrypted tokens (the original granted `service_role`-only, which the user-context calls could never satisfy); (3) use `vault.create_secret`/`update_secret` (guaranteed AES encryption) instead of a raw `INSERT` that stores plaintext in current Vault. Also found and fixed a second blocker: the `calendar_provider` enum was missing `outlook` and `ics` (migration `20260608200000`), so those connections failed at creation. Verified end-to-end on prod: store/get round-trip for all token types, owner-allowed / stranger-denied, and the full sync flow's DB deps now all resolve. `delete_oauth_tokens` now removes all token types (incl. Apple's) on disconnect.
- **`calendar_events` orphan-read bug** (8 June) — the canonical calendar table is `events`; `calendar_events` was an empty legacy orphan (0 rows, **zero writers**) that 9 application sites + the `get_dashboard_summary` RPC still *read*, so they silently returned nothing. Broke: GDPR calendar export (Article 15/20), AI calendar context, countdowns, bulk archive, and **the dashboard event count (always 0 regardless of real events)**. Same class as the meal_plans orphan-read (#429). Repointed all 11 code sites + the RPC to `events` (adding `deleted_at IS NULL` to active reads; bulk archive now *soft*-deletes instead of hard-deleting). Migration `20260608170000_fix_calendar_events_orphan_reads.sql` recreates `get_dashboard_summary` and drops the orphan table. 16/16 advisors hold; dashboard verified counting real events. Found by live prod QA sweep. **Known follow-up:** `get_dashboard_summary` filters tasks/chores `status = 'in_progress'` (underscore) vs the real `'in-progress'` enum (hyphen) — likely zeroes the dashboard "in progress" counts; flagged for a separate dashboard-RPC audit.
- **CRITICAL: meal→shopping, goal/habit creation, and account deletion** (#429) — three bugs found by live prod QA: (1) `meal_plans` orphan-read — `generate-from-meals` queried a dead 0-writer table, so "Generate Shopping List" was 100% broken; repointed to `meals`. (2) Four orphan `activity_feed` triggers `PERFORM`ed a dropped function, so goal / check-in / habit creation 500'd. (3) 19 FKs to `auth.users` aborted `auth.admin.deleteUser`, so account deletion was fully broken; converted to CASCADE / SET NULL by nullability. Added 2 CI advisor invariants.
- **Notification reads against dropped tables** (#430) — stopped reading the dropped `notification_preferences` / `user_profiles` tables.
- **Orphan `/expenses` page + silent reminder 400 + dead chore-completions** (#431) — removed an orphaned legacy `/expenses` page whose "Add" buttons had no handlers (redirect to `/budget`); the New Reminder modal silently 400'd and closed on an empty date (added client-side guard + visible error); dropped dead `chore_completions` references. The redirect surfaced that the `/budget` hub lacked a FeatureGate despite being a Plus feature — added the gate.
- **`reward_points` 409 console error on page load** (6 June) - `pointsService.getOrCreatePointsRecord` did read-then-insert, but dashboard + tasks both call `getUserStats` on mount, so two concurrent callers read 0 rows and both inserted; the second hit the `(user_id, space_id)` unique constraint → 409. Switched to an idempotent `upsert({ onConflict: 'user_id,space_id', ignoreDuplicates: true })` + re-fetch: concurrent creates no-op instead of conflicting, and an existing balance is never overwritten. +1 race-safety test. Found by live prod QA.
- **CRITICAL: shopping-item writes 500 in production** (6 June) - same orphan-trigger class as the task fix below. A DB-wide scan for triggers referencing now-dropped tables found `shopping_items.track_item_history` (function `track_shopping_item_history`) still does `INSERT INTO shopping_item_history` (a table PR #344 dropped), so adding/updating a shopping-list item threw `42P01`. Migration `20260606200000_drop_orphan_shopping_history_trigger.sql` drops the orphan trigger + function (idempotent, `IF EXISTS`/`CASCADE`). Proven against prod in a rolled-back transaction. (The same scan confirmed `reminders.log_reminder_change` writes to the existing `reminder_activities` table - not affected.) Found by live prod QA.
- **CRITICAL: task creation (and reassignment) 500 in production** (6 June) - every `INSERT` into `tasks` failed with `ERR 42P01: relation "task_activity_log" does not exist`. PR #344's "25 orphan tables" cleanup (2026-03-16) dropped `task_activity_log` / `task_handoffs` / `task_assignments` based on zero *application-code* references, but missed the *database* references: AFTER-triggers on `tasks` still wrote to them. The squash baseline represented the orphan trigger/function as removed for fresh CI DBs, but that DROP was never applied to prod, so prod kept the orphans (same class as the Oct-2025 silently-failed DROPs). Migration `20260606190000_drop_orphan_task_activity_trigger.sql` drops all three orphan audit functions + their triggers (`log_task_changes`/`tasks_activity_log_trigger` → INSERT; `record_task_handoff`/`tasks_handoff_tracking_trigger` → reassignment; dangling `sync_task_primary_assignment`). Idempotent (`IF EXISTS` + `CASCADE`); no-ops on CI. Fix proven against prod in a rolled-back transaction (insert succeeded with triggers dropped). Found by live prod QA.
- **CRITICAL: onboarding / profile / email-notifications 500 in production** (6 June) - `/api/welcome`, `/api/user/profile`, and `/api/notifications/email` each `import DOMPurify from 'isomorphic-dompurify'` at module top, which crashed the entire route at load in the Vercel serverless runtime: `ERR_REQUIRE_ESM` from `jsdom -> html-encoding-sniffer@6 -> @exodus/bytes` (the latter shipped ESM-only via supply-chain drift; no code change here triggered it). Result: a new user could not complete onboarding (the first screen 500'd), profile reads/writes failed, and outbound email sanitization crashed. The build never caught it because the package is externalized and never loaded at build time, and no test exercised these routes at runtime. **Fix:** route all three through the existing `lib/sanitize.ts`, which lazy-loads DOMPurify inside a try/catch with a regex fallback (built precisely "to avoid JSDOM issues in serverless"). `welcome`/`profile` now use `sanitizePlainText` (pure regex, never loads jsdom); `notifications/email` uses a new `sanitizeRichHtml` (broad email allowlist, lazy DOMPurify + graceful regex fallback). No module-top `isomorphic-dompurify` import remains in any route; a regression test asserts this. +10 sanitize tests. Found by live prod QA.
- **Documentation drift reconciliation** (3 June) - root `CLAUDE.md`, `ARCHITECTURE.md`, and `README.md` claimed Stripe (the dependency is `@polar-sh/sdk`, no Stripe SDK present) and Next.js 15 (`package.json` pins `next@^16.2.6`); `ARCHITECTURE.md` listed a stale "117 files" service count (actual 173). Corrected all four. Surfaced by the 3-June 360 audit. Phase 17.1 in `rowan-backlog.md`.
- **E2E auth-verifier false positive** (#390) — `auth.setup.ts` and `ensureAuthenticated` were verifying auth via `GET /api/csrf/token`, but that route only rate-limits and returns a token; it never invokes `supabase.auth.getUser()`. A 200 there meant "rate-limit OK," not "session valid," so unauthenticated sessions could pass verification and get saved as Playwright storage state. Fix: NEW `/api/auth/session` route that actually calls `getUser()`; harness updated to use it. CSRF token rate limit also bumped from 10/10s (general) to 100/10s (dedicated `checkCsrfTokenRateLimit`) to stop parallel CI workers from colliding on token fetches and being misread as auth failures. Resolves Phase 8.1 in `rowan-backlog.md`.
- **CI drift audit gate** (#389) — `scripts/ci/migration-drift-audit.mjs` now runs on every PR via the Lint & Type Check job. Catches first-create-wins drift (the Oct-2025 footgun pattern) at PR-time instead of post-deploy.

### Removed
- **Daily Digest / "JARVIS Morning Briefing" feature** — fully retired. Deleted: hourly cron entry in `vercel.json`, `app/api/cron/daily-digest/`, `app/api/notifications/digest-preview/`, `lib/jobs/daily-digest-job.ts`, `lib/emails/templates/DailyDigestEmail.tsx`, `lib/emails/templates/AIDailyDigestEmail.tsx`, `sendDailyDigestEmail` / `sendAIDailyDigestEmail` / `renderAIDailyDigestHTML` from `email-service.ts`, the AI Daily Briefing UI section in `NotificationSettings.tsx`, the `digest` notification log category, and the household docs reference. Migration `20260507044831` drops the now-unused `digest_enabled`/`digest_time`/`digest_timezone`/`digest_frequency`/`timezone` columns from `user_notification_preferences`. The DB-level cleanup migration `20251020060000` from October 2025 had silently failed to apply against prod; the new migration idempotently completes it.
- `notification-preferences-service.ts` no longer references the dropped digest fields (#366 + this PR).
- **`lib/services/notification-service.ts`** — fully deleted (812 LOC + tests). Service had zero non-test callers and queried the orphan `notification_preferences` (singular) table that migration `20251020000002` had tried to drop in October 2025 but silently failed against prod. New migration `20260507051236` idempotently drops the table for real.

### Changed
- Dashboard restructure — new StatCard, CheckInSection, RewardsSection components
- Custom hooks: `useActiveSessions`, `useCheckIn`, `useSpaceMembers`
- Settings tabs decomposed: AnalyticsTab, DocumentationTab, ProfileTab, SecurityTab

### Added
- `scripts/database/check-db-advisors.ts` — new **orphan-trigger invariant**: scans every active trigger's function body for writes to non-existent tables and fails the deploy drift-check if any exist. Closes the class behind the June task/shopping 500s (drop a table, leave a trigger writing to it). Strips SQL comments before matching to avoid prose false positives.
- `scripts/ci/schema-check.ts` — CI gate that probes 8 high-traffic tables for column drift between application code and migrations. Catches "I edited the dashboard but forgot the migration" in 5 seconds instead of months.

### Security
- **Patched 5 moderate transitive advisories** (SEC-DEP-01, surfaced by the 5 June `/sec-ship --comprehensive` deferral) via three `pnpm.overrides` edits — `brace-expansion` (GHSA-jxxr-4gwj-5jf2, DoS), `ws` (GHSA-58qx-3vcg-4xpx, uninitialized memory disclosure), `qs` (GHSA-q8mj-m7cp-5q26, DoS). The pre-existing `qs`/`brace-expansion` pins had gone stale (`>=6.14.2`, `<5.0.5`) against the newer advisories; tightened to `>=6.15.2` and `>=5.0.6`, added a `ws@>=8.20.1` pin. `pnpm audit` now reports zero vulnerabilities. Also **constrained `undici` to `>=7.24.0 <8`**: a broad `pnpm update` had drifted it to 8.3.0 (via a jsdom bump), which breaks the production build — the externalized `isomorphic-dompurify → jsdom@28` path requires undici 7's `wrap-handler.js`. The `<8` ceiling makes that drift impossible. Fix is override-only (no app-code change); build + 8702 unit tests green. Deferred to a future `/migrate`: 12 major bumps (typescript 6, eslint 10, lucide-react 1, `@polar-sh/sdk` 0.48, `@supabase/ssr` 0.10, isomorphic-dompurify 3) — each needs its own branch + verification.

---

## February 2026

### Added
- Persistent desktop chat panel with auth optimization and server-side tier enforcement (#216)
- AI Companion Tiers 1-4: infrastructure, chat UX, mobile nav, AI dashboard, landing page (#206, #208)
- E2E Intelligence System with Playwright test framework (#204)
- Standardized public page layouts and simplified homepage CTA (#202)
- CI security scan on schedule with GitHub Issues integration
- `get_dashboard_summary` RPC for optimized dashboard queries
- Subscription retry logic and monitoring for production resilience (#205)

### Fixed
- CI: dynamically repair all migration versions in deploy workflow (#215)
- Design audit Wave 2: tablet breakpoints, contextual empty states, modal animations, touch UX (#212)
- Accessibility: reduced motion, focus-visible, skip-to-content, touch targets (#211)
- Homepage design audit: a11y, contrast, tablet breakpoints, CLS prevention (#210)
- Build: skip type-check on Vercel to prevent OOM kills
- CSP worker violation and missing RPC fallback (#200)
- 3 race conditions resolved with atomic Supabase RPCs (#199)
- Red team security findings and dead code cleanup (#198)
- Production audit remediation — 28 findings (#191), 9 findings (#183), 6 findings (#182)
- Numerous E2E test stabilization fixes (seeding, selectors, timeouts, cookie banners)
- Logger: properly serialize Error objects for development logs

### Changed
- Decompose 9 monolithic pages into thin orchestrators with extracted hooks (#217)
- Sync local migration files with production Supabase (#214)
- Removed deleted e2e-intelligence dependency (#207)
- Dependency bumps: minor-and-patch group (#203)

### Performance
- Complete 20/23 performance optimization audit (#179, #180)

---

## January 2026

### Added
- Homepage restructure with Remotion video showcases and conversion funnel (#209)
- Admin: period comparison, drill-down views, perf improvements, native bridges (#213)
- Security hardening + remove standalone feature pages (#197)
- AI chat and voice assistant — Rowan Assistant (#196)
- UI polish and Clarus-style PWA install prompt (#194)
- Complete sprint extension with comprehensive security audit fixes (#193)
- ARCHITECTURE.md and JSDoc comments (#192)
- Veteran-owned badge added to footer (#195)

### Fixed
- Security: sanitize repo for public visibility
- Security: remove project IDs, paths, and emails from tracked files
- CI: use repository variables for NEXT_PUBLIC_ env vars (#188)
- CI: update Supabase CLI for db push (v2.75.0 breaking change)
- Demo animation stabilization (#195)

### Changed
- Repo sanitization for public visibility

---

## December 2025

### Added
- 1-5 energy level for daily check-in (#179)
- CTA card on article pages (#178)
- 40 SEO blog articles across 8 feature categories; remove Payload CMS (#176, #177)
- Split Header into PublicHeader and authenticated Header (#161)
- Polar refinements, Payload CMS integration, founding members flow (#159)
- Offline support: Phase 5 & 6 features, low-connectivity resilience, YouTube-style banner
- 36 Capacitor plugins installed with native bridges
- Articles section for SEO and marketing content (#154)
- Centralized DeviceContext for mobile detection (#153)
- Enhanced auth UI with glassmorphism and animations
- Public feature pages and standardized CTAs (#150)
- Email verification enforcement for new signups

### Fixed
- Auth: perpetual loading and subscription churn resolved (#175)
- Auth: magic link race condition and rate limiting (#151)
- CI: deploy via Vercel remote build instead of local build (#170)
- CI: migrate workflows from npm to pnpm (#165)
- Security: UUID admin auth, headers, validation audit (#163)
- Firebase: gitignore native dirs, upgrade FCM to v1 API (#162)
- UI: modal mobile positioning for all modals (#142)
- UI: spotlight card effects and nested button hydration (#157)
- UI: remove light mode CSS remnants (#155)
- Feedback modal z-index and portal rendering (#148)
- Bills and expenses mobile UI (#144)
- Subscription: safe hooks to prevent context errors

### Changed
- Dead code cleanup: remove 42 files, 18 packages (#168)
- Remove 8 dead service files (#174), 3 dead UI components (#172)
- Remove remaining dead code from second sweep (#171)
- Migrate from npm to pnpm (#164)
- Convert to dark mode only and remove theme toggle (#155)
- All buttons converted to pill shape (rounded-full) (#149)
- Modular signup with database trigger provisioning

### Performance
- Aggressive data prefetching for instant page navigation (#140)

---

## November 2025

### Added
- Tablet responsive design and feedback button improvements (#125)
- Beta signup improvements and login/signup mobile redesign (#123)
- Mark beta invite codes as used after signup (#120)
- Batch 10 database optimizations and deferred work (#119)
- Batch 9 optimizations: caching, timeouts, Sentry sampling (#118)
- Redis caching for conversations and goal stats (Batch 8)
- Consolidated legal page with tabs (#117)
- Professional BetaInviteEmail React template
- Admin panels with RLS security fixes
- Beta tester full access with admin dashboard improvements (#116)
- Email-based beta signup system with 100 user limit (#115)
- Maskable icon for Android adaptive icons (#124)
- Monetization Phases 1-9: database schema, Stripe integration, service layer, API routes, pricing page, feature gating, checkout, payment webhooks, email notifications, billing summary, trial infrastructure, upgrade UI, structured logging, error monitoring (#53-#87, #97)
- Feature usage tracking for admin dashboard (#105)
- GDPR compliance updates (#110)
- PWA performance UX utilities and offline support (#108)
- Calendar integration: Google OAuth, Apple Calendar, Outlook, ICS, AI event parser (#64, #65, #70, #72)
- Rewards and gamification system (#73, #76)
- AI-powered daily digest with Gemini (#77)
- Important Dates with countdown integration (#76)
- Projects: milestones/steps feature for project tracking
- Bills integration with reminders and calendar
- Storage management system with quota enforcement (#57, #58)
- Data Management settings tab (#60)
- Comprehensive beta feedback system (#50)

### Fixed
- Admin: Web Crypto API ArrayBuffer issue in Vercel Edge Runtime
- Admin: memory usage display against Vercel 1024MB limit
- Security: Cloudflare Insights CSP fixes (#121, #122)
- Security: comprehensive audit findings (#104, #107, #109, #156)
- Build: centralized supabaseAdmin in beta-expiration-emails route
- Subscription: hide trial banner for beta testers
- PWA: remove maskable icons to prevent black circle on home screen
- Auth: perpetual loading with timeout protection (#35)
- Supabase: singleton pattern to eliminate multiple GoTrueClient instances (#36)
- Meals: timezone issues causing date shifts (#59, #61)
- Security: critical admin session and password storage vulnerabilities
- Activity feed: correct table names and column references (#66)
- Projects: step saving and empty date handling
- Pricing: toggle functionality, image paths, card heights

### Changed
- Upgrade to Next.js 15.5.9 with React 19 (#106)
- Streak improvements, space simplification, calendar integration (#103)
- Admin dashboard redesign with SSO and tabbed Management Console
- Mobile modals migrated to bottom sheet pattern
- CollapsibleStatsGrid added to all feature pages (#113)

### Performance
- Debounce added to 5 remaining search components (Batch 7)
- Parallel processing optimizations (Batch 6)
- Debounce on search inputs and memoized filters
- HTTP Cache-Control headers on API routes
- Redis caching for activity feed service
- Middleware, realtime, and webhook optimizations (Batch 2)
- Comprehensive database, network, and UI optimization pass
- Non-blocking email sending for instant API response
- Streamlined GitHub Actions with parallel jobs

---

## October 2025

### Added
- Initial project setup: Next.js 15 with full app structure
- GitHub Actions CI/CD pipeline
- Comprehensive feature set: tasks, shopping, meals, reminders, messages, goals, budgets, bills, calendar, chores
- Dashboard with activity feed, daily check-in, countdown widget (#49, #69)
- Space management with member presence tracking (#10, #12)
- Real-time collaboration for projects, expenses, budgets, calendar proposals
- Chore rewards and gamification system
- Recurring task functionality with biweekly support
- Collapsible sidebar navigation
- WhatsApp-style messaging UI with glassmorphism effects
- Comprehensive security: CSP policy, DOMPurify sanitization, RLS policies, admin authorization
- Weather integration with Redis caching
- Beta testing system with admin dashboard
- Email authentication with Resend
- Comprehensive documentation system
- Apple-style search inputs with brand colors across all pages
- Consolidated modal system with family collaboration
- Member assignment for goals, shopping, and meals

### Fixed
- Auth: signup database errors, RLS circular dependencies, authentication hangs
- Auth: profile persistence and invitation permissions (#11)
- Database: FK constraint violations, cascade deletes, orphaned records
- Tasks: creation errors with calendar sync and recurring patterns
- Shopping: UUID errors, trip scheduling
- Reminders: race conditions in status cycling, FK constraint violations
- Messages: emoji picker overlap, thread navigation
- UI: modal button styling, breadcrumb spacing, header alignment
- Spaces: infinite recursion in RLS policies
- CSP: multiple rounds of policy fixes for production compatibility
- Zod: `error.errors` corrected to `error.issues` in API routes

### Changed
- Guided creation flow removed; streamlined message interface
- Type safety: fix 21+ `any` types for near-100% type coverage (#47, #48)
- Service layer compliance: Phase 2 complete (#46)
- Security governance refactoring from audit (#45)
- Comprehensive zombie code cleanup and dependency optimization
- Meal planning UI and modal consistency improvements

### Performance
- Database: FK indexes added, duplicate policies removed
- Admin dashboard optimized for faster loading
- React Query optimization with 90%+ performance gains (#33, #34)
- Database query optimization passes

---

_Rowan development started October 5, 2025._
