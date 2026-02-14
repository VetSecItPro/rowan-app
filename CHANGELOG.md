# Changelog

All notable changes to Rowan are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed
- Dashboard restructure — new StatCard, CheckInSection, RewardsSection components
- Custom hooks: `useActiveSessions`, `useCheckIn`, `useSpaceMembers`
- Settings tabs decomposed: AnalyticsTab, DocumentationTab, ProfileTab, SecurityTab

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
