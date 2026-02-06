# Rowan Master TODO

> **Single source of truth for all work.** Updated: 2026-02-05 (Sprint Extension complete)
>
> This file is self-contained — a new Claude session should read ONLY this file
> (plus `CLAUDE.md`) to understand the full project status.

---

## Project Context

**Rowan** is a family/household management app — tasks, chores, meals, budgets, goals,
calendar, shopping lists, reminders, messages, and a rewards system. Multi-space
architecture (one family = one space). **Dark mode ONLY** — no light mode.

### Architecture

- **ONE CODEBASE**: Next.js 15 + Capacitor → web + iOS + Android
- Capacitor wraps the Vercel-hosted web app in a native WebView
- `ios/` and `android/` dirs are GENERATED and gitignored
- Native bridges in `lib/native/` for push notifications, geolocation, haptics, etc.

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.4.11 |
| UI | React | 19.0.0 |
| Language | TypeScript (strict) | 5 |
| Styling | Tailwind CSS | 4.0.0 |
| Animation | Framer Motion | 12.23.24 |
| Icons | Lucide React | 0.561.0 |
| Backend/Auth | Supabase (PostgreSQL + Auth + RLS) | 2.58.0 |
| Data Fetching | TanStack React Query | 5.90.11 |
| Validation | Zod | 4.1.11 |
| Rate Limiting | Upstash Redis + Ratelimit | 1.35.8 / 2.0.7 |
| Email | Resend | 6.2.0 |
| Payments | Stripe + @stripe/react-stripe-js | latest |
| Error Tracking | Sentry (@sentry/nextjs) | 10.30.0 |
| XSS Prevention | isomorphic-dompurify | 2.33.0 |
| Native Mobile | Capacitor | 8.0.1+ |
| Package Manager | pnpm | 10.28.0 |

### Deployment

- **Hosting**: Vercel (team: VetSecItPro, team_HFUTBVxI8jKYi334LvgVsVNh)
- **Domain**: rowanapp.com
- **Database**: Supabase (project ref: mhqpjprmpvigmwcghpzx)

### Feature Colors

```
tasks: blue | calendar: purple | reminders: pink | messages: green
shopping: emerald | meals: orange | household: amber | goals: indigo | location: cyan
```

---

## Completed: Launch Sprint Extension (T-51 to T-67)

**Branch**: `feature/launch-sprint-landing-page`
**Status**: All 17 tasks complete. T-51–T-62 implemented in this sprint; T-63–T-67 were pre-existing.

### Tier 1: Accessibility + Performance

- [x] **T-51**: Create `PublicHeaderLite` for landing page
  - Stripped auth-context imports (~80-150kB savings)
  - Files: `components/layout/PublicHeaderLite.tsx`, `app/page.tsx`

- [x] **T-52**: Add `useReducedMotion()` to landing page
  - Applied to: `HeroDemoAnimation.tsx`, `AnimatedFeatureDemo.tsx`, `PainPointsSection.tsx`, `ComparisonSection.tsx`, `PricingPreviewSection.tsx`, `InstallSection.tsx`, `HowItWorksSection.tsx`, `SocialProofSection.tsx`

- [x] **T-53**: Add `focus-visible` styles to landing page interactive elements
  - Applied to: `HeroSection.tsx`, `MobileStickyBar.tsx`, `PublicHeaderLite.tsx`

- [x] **T-54**: Fix HeroDemoAnimation progress dots accessibility
  - Changed `<div>` to `<button>` with `aria-label` and onClick

- [x] **T-55**: Add touch-to-pause for auto-cycling demos
  - Added touch handlers + visible Pause indicator to `HeroDemoAnimation.tsx`, `AnimatedFeatureDemo.tsx`

- [x] **T-56**: Add focus trap to KeyboardShortcuts overlay
  - Implemented Tab/Shift+Tab trapping, auto-focus, focus restoration

- [x] **T-57**: MagneticButton optimization — eliminate re-renders on mousemove
  - Replaced `useState` with `useMotionValue` + `useSpring`

### Tier 2: Mobile UX

- [x] **T-58**: Full-screen mobile navigation menu
  - Enhanced `HamburgerMenu.tsx` with slide-out overlay, 48px touch targets, body scroll lock

- [x] **T-59**: Mobile filter dropdowns
  - Added `<select>` dropdowns on mobile for Calendar status filter, Reminders category/priority filters

- [x] **T-60**: List virtualization / infinite scroll
  - Created `hooks/useLoadMore.ts` and `components/ui/LoadMoreButton.tsx`
  - Integrated into Reminders page

- [x] **T-61**: Pull-to-refresh integration on main feature pages
  - Wired `PullToRefresh.tsx` into Reminders page (other pages already had it)

- [x] **T-62**: Swipe gestures on list items
  - Created `components/ui/SwipeableListItem.tsx` with framer-motion `drag`
  - Swipe left → delete (red), swipe right → complete (green)

### Tier 3: Monetization Quick Wins (Pre-existing)

- [x] **T-63**: Upgrade modal component
  - Already existed: `components/subscription/UpgradeModal.tsx`
  - Feature-specific messaging, trial-aware, non-aggressive dismissible modal

- [x] **T-64**: Post-payment success page
  - Already existed: `app/(pages)/payment/success/page.tsx`
  - Animated checkmark, subscription polling, auto-redirect, `?tier=pro|family` support

- [x] **T-65**: Post-payment cancel page
  - Already existed: `app/(pages)/payment/canceled/page.tsx`
  - "No worries!" tone, "Try Again" + "Continue with Free Plan" CTAs

- [x] **T-66**: Feature lock badge component
  - Already existed: `ProBadge`, `FamilyBadge` in `FeatureGateWrapper.tsx`, `FeatureLockOverlay` in `UpgradeModal.tsx`

- [x] **T-67**: Subscription management page/section
  - Already existed: `components/settings/SubscriptionSettings.tsx` (tab in settings)
  - Current plan card, billing summary, feature limits grid, Polar portal link

---

## Completed: 2-Week Launch Sprint (T-01 to T-50)

All 50 tasks completed. Branch: `feature/launch-sprint-landing-page`.

### T-01 to T-04: Hero Section — Commit `30abf0ca`
- [x] T-01: Rewrite hero copy for conversion
- [x] T-02: Build animated dashboard demo for hero
- [x] T-03: Replace benefits grid with trust signals
- [x] T-04: Add "How It Works" 3-step section

### T-05 to T-15: Animated Feature Demos — Commit `7e5732f1`
- [x] T-05: Build reusable AnimatedFeatureDemo component
- [x] T-06: Tasks animated demo
- [x] T-07: Calendar animated demo
- [x] T-08: Reminders animated demo
- [x] T-09: Messages animated demo
- [x] T-10: Shopping animated demo
- [x] T-11: Meals animated demo
- [x] T-12: Budget animated demo
- [x] T-13: Goals animated demo
- [x] T-14: Household/Chores animated demo
- [x] T-15: Daily Check-in animated demo

### T-16 to T-20: Conversion Sections — Commits `30abf0ca`, `0615cfec`
- [x] T-16: Redesign feature grid layout
- [x] T-17: Add social proof section — `0615cfec`
- [x] T-18: Redesign comparison section — `0615cfec`
- [x] T-19: Upgrade pricing preview on landing page — `0615cfec`
- [x] T-20: Redesign final CTA section — `0615cfec`

### T-21 to T-26: Feature Pages — Commits `0615cfec`, `7d8fa5ff`
- [x] T-21: Create shared FeaturePageLayout — `0615cfec`
- [x] T-22: Add animated demos to all 9 feature pages — `7d8fa5ff`
- [x] T-23: Rewrite feature page copy — `7d8fa5ff`
- [x] T-24: Add workflow demos to feature pages — `c5b820a5`
- [x] T-25: Add cross-feature navigation — `0615cfec`
- [x] T-26: Update feature page SEO metadata — `7d8fa5ff`

### T-27 to T-30: Onboarding — Commit `b594c8d2`
- [x] T-27: Build onboarding carousel
- [x] T-28: Add contextual empty states for all 9 features
- [x] T-29: Add first-use tooltips — `7d8fa5ff`
- [x] T-30: Add dashboard quick-start cards

### T-31 to T-36: Loading & Animation Polish — Commit `b594c8d2`
- [x] T-31: Replace animate-pulse with shimmer gradient
- [x] T-32: Add modal entrance animations
- [x] T-33: Add page transition animations
- [x] T-34: Add micro-interactions
- [x] T-35: Animate sidebar navigation
- [x] T-36: Add pull-to-refresh animation — `c5b820a5`

### T-37 to T-42: App UX Fixes — Commits `c5b820a5`, `7d8fa5ff`, `b594c8d2`
- [x] T-37: Simplify budget navigation — `c5b820a5`
- [x] T-38: Add keyboard shortcuts overlay — `7d8fa5ff`
- [x] T-39: Improve notification/feedback system — `7d8fa5ff`
- [x] T-40: Polish settings page — `7d8fa5ff`
- [x] T-41: Fix dashboard welcome widget — `b594c8d2`
- [x] T-42: Add family member avatars — `c5b820a5`

### T-43 to T-46: PWA & Technical — Commits `c5b820a5`, `7d8fa5ff`
- [x] T-43: Add PWA screenshots to manifest — `c5b820a5`
- [x] T-44: Custom PWA install prompt — `7d8fa5ff`
- [x] T-45: Generate dynamic OG images — `7d8fa5ff`
- [x] T-46: Update sitemap with all public pages — `7d8fa5ff`

### T-47 to T-50: Final Polish & QA — Commits `b594c8d2`, `c5b820a5`
- [x] T-47: Redesign footer — `b594c8d2`
- [x] T-48: Mobile-optimize landing page — `c5b820a5`
- [x] T-49: Performance audit on landing page — `c5b820a5`
- [x] T-50: Cross-browser and device QA — `c5b820a5`

---

## Backlog: Monetization

**Status**: Stripe LIVE in production (December 11, 2024).
Pricing: Pro $11.99/mo ($119/yr), Family $17.99/mo ($179/yr).
Webhook: `https://rowanapp.com/api/webhooks/stripe`

### Completed Phases
- [x] Phase 1: Foundation & Database Schema (PR #53)
- [x] Phase 2: Stripe Integration Setup (PR #53)
- [x] Phase 3: Service Layer & Business Logic (PR #54)
- [x] Phase 4: API Routes & Stripe Webhooks (PR #85)
- [x] Phase 5: Frontend - Pricing Page & Upgrade Components (PR #85)
- [x] Phase 6: Feature Gating Implementation (PR #85)
- [x] Phase 11: Production Deployment (LIVE)

### Remaining Phases (TODO)
- [ ] Phase 7: Payment Flow polish (edge cases, retries)
- [ ] Phase 8: User Dashboard & Account Management (refine subscription page)
- [ ] Phase 9: Analytics & Monitoring (full dashboard, metrics)
- [ ] Phase 10: E2E Testing (Playwright CI)
- [ ] Phase 12: Post-Launch Monitoring (churn tracking, revenue dashboards)

### Feature Limits by Tier

| Feature | Free | Pro | Family |
|---------|------|-----|--------|
| Active tasks | 25 | Unlimited | Unlimited |
| Calendar | No | Yes | Yes |
| Meals/Reminders/Goals | Limited | Unlimited | Unlimited |
| Members | 1 | 2 | 6 |
| Storage | 500MB | 5GB | 15GB |
| AI Features | No | No | Yes |
| Integrations | No | No | Yes |

> Full implementation reference: `docs/planning/MONETIZATION_IMPLEMENTATION_TODO.md`

---

## Backlog: AI Companion

**Status**: Planning phase. Target Q3-Q4 2026. NOT current sprint work.

### Phases
1. **Foundation** (Months 1-2): Text chat + tool calling, opt-in beta
2. **Beta Launch**: Gather feedback, iterate on responses
3. **GA**: General availability across all tiers with usage limits
4. **Mobile Redesign** (Months 5-6): AI-first interface, voice input
5. **AI-Native Features** (Month 7+): Proactive intelligence, predictive suggestions

### Key Differentiators
- Contextual awareness (knows entire household)
- Natural language interface (no forms)
- Proactive intelligence (surfaces important items)
- Voice-first mobile (hands-free interaction)

### Pricing Strategy (Recommended)
- Include basic AI in all tiers with usage limits
- Personal: 50 conversations/mo, Partnership: 200/mo, Family: 500/mo

> Full strategy reference: `docs/planning/ai-companion-roadmap.md`

---

## Backlog: Native App Submission

**Status**: Blocked on Apple/Google developer accounts.

### What's Ready
- Capacitor config with 36+ plugins
- Firebase project for push notifications
- Native bridges in `lib/native/` (push, geolocation, haptics, biometrics)
- iOS/Android directories generated via `npx cap sync`

### What's Needed
- Apple Developer Program enrollment ($99/yr)
- Google Play Developer account ($25 one-time)
- APNs key upload to Firebase
- Physical device testing (iPhone + Android)
- App Store Connect / Play Console store listings
- Screenshots, app preview video
- Privacy policy URLs configured for stores

> Implementation guide: `docs/rowan-mobile-app.md`
> Offline support: `docs/rowan-mobile-offline.md`

---

## Backlog: Post-Launch Enhancements

- [ ] **Bank Integration (Plaid)**: Connect bank accounts for automatic transaction import
- [ ] **AI Savings Suggestions**: ML-powered budget optimization recommendations
- [ ] **i18n/Localization**: Infrastructure setup (next-intl), translations come later
- [ ] **Mutation Queue**: Offline write support (queue mutations, sync when online)
- [ ] **Request Optimization**: Compress payloads for 2G/3G connections
- [ ] **Advanced Analytics**: Dashboard usage metrics, feature adoption tracking

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| AI Companion Roadmap | `docs/planning/ai-companion-roadmap.md` | 50K token strategy doc |
| Monetization Implementation | `docs/planning/MONETIZATION_IMPLEMENTATION_TODO.md` | Detailed phase-by-phase guide |
| 2-Week Sprint Record | `docs/planning/two-week-launch-sprint.md` | Historical T-01 to T-50 |
| Marketing Plan | `docs/planning/marketing_plan.md` | Marketing strategy |
| Marketing Campaign | `docs/planning/rowan-marketing-campaign.md` | Campaign execution |
| Mobile App Guide | `docs/rowan-mobile-app.md` | Capacitor/native setup |
| Mobile Offline | `docs/rowan-mobile-offline.md` | Offline support docs |
| Marketing Strategy | `docs/rowan-marketing-strategy-jan26.md` | Jan 2026 strategy |
| Guides (14 files) | `docs/guides/*` | How-to references |
| Architecture (4 files) | `docs/architecture/*` | Tech references |
| Security | `docs/security/MONETIZATION_SECURITY.md` | Security reference |
| Beta Tester Info | `docs/status/betatester-info.md` | Beta reference |
| Sentry Setup | `docs/status/SENTRY_COMPLETE_SETUP.md` | Monitoring reference |
| Performance Reports | `docs/analysis/PERFORMANCE_*.md` | Perf references |
| Audit Summary | `docs/analysis/AUDIT_SUMMARY.md` | Audit reference |
| Accessibility Audit | `docs/analysis/accessibility-contrast-audit.md` | A11y reference |
| Docs Index | `docs/README.md` | Documentation index |
