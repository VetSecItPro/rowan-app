# Rowan Performance Optimization Audit — Jan 31 2026

> Deep sweep across rendering, bundle size, navigation, DB queries, caching, network, animations, Next.js config, and service worker.

**Score: 20/23 completed** | 2 deferred (incremental) | 1 skipped (no ROI)

---

## Critical (Fix First) — 4/4 Done

- [x] **1. Remove root layout `force-dynamic` — move to auth routes only**
  - Removed from root `app/layout.tsx`. Added to `app/(main)/layout.tsx` and `app/(auth)/layout.tsx` only.
  - **Impact:** HIGH | **Effort:** Quick

- [x] **2. Consolidate dashboard 18-query waterfall into single RPC**
  - Created `get_dashboard_summary` Supabase RPC. Rewrote `useDashboardStats` to call it.
  - **Impact:** HIGH | **Effort:** Medium refactor

- [x] **3. Migrate feature pages from useState/useEffect to React Query**
  - Wired `AppQueryProvider` into root layout using singleton `queryClient`. Extended `QUERY_KEYS` for all features. Migrated shopping + meals pages to `useQuery` with optimistic updates and cache invalidation via real-time subscriptions.
  - **Impact:** HIGH | **Effort:** Significant (incremental — goals page deferred due to complex real-time logic)

- [x] **4. Convert static pages from client to server components**
  - Removed `'use client'` from 5 legal pages (terms, privacy, privacy-policy, security, cookies). Feature marketing pages kept as client components (Framer Motion dependency).
  - **Impact:** HIGH | **Effort:** Quick-medium per page

---

## High Priority — 2/3 Done

- [ ] **5. Replace `select('*')` with specific columns in read queries** *(deferred — incremental)*
  - **Audit result:** 287 pure read queries need fixing across ~70 service files. 65+ export/write instances are fine as-is.
  - **Why deferred:** Each instance requires tracing all callers to determine needed columns. Supabase returns loosely typed data, so TypeScript won't catch missing columns — silent runtime failures. Best done service-by-service during feature work, starting with highest-traffic services (messages, calendar, tasks, checkins, goals).
  - **Impact:** HIGH | **Effort:** HIGH (287 instances, ~2-5 min each)

- [x] **6. Add missing query limits to goals/reminders/shopping services**
  - Added `.limit(500)` to `goals-service.ts` and `reminders-service.ts`. Added `.limit(200)` to `shopping-service.ts`.
  - **Impact:** HIGH | **Effort:** Quick

- [x] **7. Lazy-load calendar page sub-components**
  - Converted 7 modals/dialogs to `next/dynamic` with `{ ssr: false }`: NewEventModal, EventDetailModal, EventProposalModal, BulkEventManager, TemplateLibrary, UnifiedItemPreviewModal, ConfirmDialog.
  - **Impact:** MEDIUM | **Effort:** Medium

---

## Medium Priority — 9/10 Done

- [x] **8. Add metadata exports for SEO on public pages**
  - Added `export const metadata: Metadata` to 5 legal pages (terms, privacy, privacy-policy, security, cookies). Articles page already had metadata via `generateMetadata`.
  - **Impact:** MEDIUM | **Effort:** Medium

- [x] **9. Add cache headers to API routes**
  - Added `withUserDataCache()` to `/api/budgets` GET handler. Audit confirmed 14+ other GET routes already have cache headers.
  - **Impact:** MEDIUM | **Effort:** Quick

- [x] **10. Replace raw `<img>` tags with next/image**
  - Replaced 4 `<img>` tags in MealCard.tsx, DraggableItemsList.tsx, FamilyMapView.tsx (x2). One template literal `<img>` in Leaflet popup left as-is (can't use React components in raw HTML).
  - **Impact:** MEDIUM | **Effort:** Quick

- [x] **11. Dynamic import `canvas-confetti`**
  - Converted BadgeNotification.tsx and MilestoneCelebration.tsx to `async` callbacks with `const confetti = (await import('canvas-confetti')).default`. Removed static imports.
  - **Impact:** MEDIUM | **Effort:** Quick

- [x] **12. Lazy-load messages page modals and VoiceRecorder**
  - Converted 5 components to `next/dynamic`: NewMessageModal, DeleteMessageModal, VoiceRecorder, NewConversationModal, ForwardMessageModal.
  - **Impact:** MEDIUM | **Effort:** Quick

- [x] **13. Move blog articles data out of JS bundle**
  - Stripped `htmlContent` from articles listing page before passing to client component. The ~2K lines of HTML are now only used server-side on individual `[slug]` pages.
  - **Impact:** MEDIUM | **Effort:** Medium

- [x] **14. Add ISR/revalidate to static-ish pages**
  - Added `export const revalidate = 86400` (24hr) to 5 legal pages. Added `export const revalidate = 3600` (1hr) to `articles/[slug]` page.
  - **Impact:** MEDIUM | **Effort:** Quick

- [x] **15. Cache API responses in service worker**
  - Updated `networkFirst()` in `public/sw.js` to cache successful GET responses in the dynamic cache for offline fallback.
  - **Impact:** MEDIUM | **Effort:** Quick

- [ ] **16. Add Suspense boundaries to feature pages** *(deferred — incremental)*
  - **Why deferred:** Requires converting pages to `useSuspenseQuery` and splitting into wrapper + data components. React Query migration already provides `isLoading` states, so the UX improvement is marginal. Best addressed page-by-page as React Query migration continues.
  - **Impact:** MEDIUM | **Effort:** Medium

- [x] **17. Add `date-fns` to `optimizePackageImports`**
  - Combined with item 21 — expanded list to `['lucide-react', 'framer-motion', 'date-fns', '@supabase/supabase-js', 'sonner']`.
  - **Impact:** MEDIUM | **Effort:** Quick

---

## Low Priority — 5/6 Done

- [x] **18. Optimize landing page blur animations for mobile**
  - Reduced blur from `blur-3xl` to `blur-xl` on mobile (keeps `blur-3xl` on `sm:+`). Added `will-change-transform` for GPU compositing.
  - **Impact:** LOW | **Effort:** Quick

- [x] **19. Reduce dashboard card stagger animation delay**
  - Removed `scale` from mobileCardAnimation. Reduced `y` offset from 16 to 12, duration from 0.3s to 0.25s, stagger from 50ms to 40ms per card.
  - **Impact:** LOW | **Effort:** Quick

- [ ] **20. Replace Framer Motion with CSS animations on marketing pages** *(skipped — no ROI)*
  - **Why skipped:** `MagneticButton` (used on all 9 feature pages) imports `framer-motion` directly. Even if all `motion.*` usage is removed from pages, the framer-motion chunk still loads. No bundle size reduction.
  - **Impact:** LOW | **Effort:** Quick-medium

- [x] **21. Expand `optimizePackageImports` list**
  - Combined with item 17. Changed from `['lucide-react', 'framer-motion']` to include `date-fns`, `@supabase/supabase-js`, `sonner`.
  - **Impact:** LOW | **Effort:** Quick

- [x] **22. Add missing `loading.tsx` skeletons**
  - Created 8 skeleton files: `/rewards`, `/budget`, `/budget-setup`, `/reports`, `/projects`, `/recipes`, `/achievements`, `/location`.
  - **Impact:** LOW | **Effort:** Quick

- [x] **23. Fix service worker precaching auth routes**
  - Removed `APP_SHELL_ROUTES` precaching from SW install event. Auth-protected routes now cache dynamically on first successful visit.
  - **Impact:** LOW | **Effort:** Quick

---

## Summary

| Priority | Done | Total | Rate |
|----------|------|-------|------|
| Critical | 4 | 4 | 100% |
| High | 2 | 3 | 67% |
| Medium | 9 | 10 | 90% |
| Low | 5 | 6 | 83% |
| **Total** | **20** | **23** | **87%** |

### Deferred items (do incrementally)
- **#5** — `select('*')` → specific columns (287 read queries). Do per-service during feature work.
- **#16** — Suspense boundaries. Do per-page as React Query migration continues.

### Skipped
- **#20** — Framer Motion removal from marketing pages. No bundle impact due to MagneticButton dependency.
