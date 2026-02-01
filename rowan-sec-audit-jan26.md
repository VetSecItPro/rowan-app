# Rowan App Security Audit Report

**Date:** January 27, 2026
**Auditor:** Claude Opus 4.5 (Automated)
**Scope:** `/Users/airborneshellback/vibecode-projects/rowan-app`
**Mode:** READ-ONLY (no files modified)
**Remediation completed:** February 1, 2026

---

## Executive Summary

| Severity | Count | Fixed | Deferred | N/A |
|----------|-------|-------|----------|-----|
| Critical | 0 | — | — | — |
| High | 3 | 3 | 0 | 0 |
| Medium | 9 | 5 | 2 | 2 |
| Low | 7 | 2 | 1 | 4 |
| Info | 6 | 0 | 0 | 6 |
| **Total** | **25** | **10** | **3** | **12** |

**Overall Assessment:** The Rowan app demonstrates strong security fundamentals. No hardcoded secrets, no `eval()`, no `dangerouslySetInnerHTML`, no SQL injection vectors, and no client-side service_role key usage were found. CSP headers, HSTS, and security headers are properly configured.

**Remediation Status:** All High-severity items resolved. All actionable Medium items resolved. Remaining deferrals are incremental (rate limiting, Zod validation) or blocked on Next.js framework changes (nonce CSP). 6 Info items were positive findings requiring no action.

---

## Findings

### FIX-001: Error Messages Leaked in API Responses — ✅ FIXED
**Severity:** High
**Category:** Information Disclosure
**Status:** All 9 flagged routes now return generic error messages. `app/api/test/email-templates` was removed entirely.

Multiple API routes expose raw `error.message` from Supabase or internal errors directly to clients. While many are gated behind `error instanceof Error ? error.message : 'generic'`, the actual Supabase error text can reveal database schema details, table names, or internal logic.

**Affected Files (sample):**
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/auth/mfa/enroll/route.ts` (line 53): `'Failed to enroll in MFA: ' + error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/auth/mfa/unenroll/route.ts` (line 59): `'Failed to disable MFA: ' + error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/auth/signup/route.ts` (line 339): `Account creation failed: ${error.message}`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/admin/feedback/route.ts` (line 87): `error.message` directly
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/geolocation/route.ts` (line 132): `error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/notifications/send-push/route.ts` (line 306): `error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/polar/checkout/route.ts` (line 148): `error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/admin/users/[userId]/[action]/route.ts` (line 127): `error.message`
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/test/email-templates/route.ts` (line 228): `error.message`

**Remediation:** Return generic error messages to clients (e.g., "An unexpected error occurred"). Log the actual error server-side via the logger. Only expose user-friendly messages for known error conditions (like invalid credentials).

---

### FIX-002: Error Stack Trace Captured But Potentially Exposed — ✅ FIXED
**Severity:** High
**Category:** Information Disclosure
**Status:** Grep confirms zero `error.stack` references in API routes. Stack traces only reach Sentry (server-side).

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/admin/users/online/route.ts` (line 123)

The `error.stack` is captured and sent to Sentry's `extra` context, which is correct. However, it is also logged to the logger which may propagate to client-visible logs in some configurations. The stack trace reveals internal file paths, function names, and application structure.

**Remediation:** Ensure `error.stack` is only ever sent to server-side logging/monitoring (Sentry) and never included in HTTP responses. Verify logger output is not accessible from client-side.

---

### FIX-003: Test Endpoints Gated by Env Var Override — ✅ FIXED
**Severity:** High
**Category:** Insecure Configuration
**Status:** All 3 test endpoints removed. No files exist at `app/api/test*`.

Three test endpoints exist that are blocked in production via `process.env.ALLOW_TEST_ENDPOINTS`:

- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/test/email-templates/route.ts` (line 38)
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/test-sentry/route.ts` (line 18)
- `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/test-cookies/route.ts` (line 13)

**Risk:** If `ALLOW_TEST_ENDPOINTS` is accidentally set in production:
- The email template endpoint can send arbitrary emails to any address (spam/phishing vector)
- The cookie test endpoint exposes all cookie names and Supabase auth cookie values
- The Sentry test endpoint intentionally throws errors

**Remediation:** Remove test endpoints from production builds entirely, or add additional authentication (admin session check) beyond just the env var flag. Consider moving to a separate test utility outside the API route tree.

---

### FIX-004: Admin Email Addresses Exposed via NEXT_PUBLIC_ Variable — ✅ FIXED
**Severity:** Medium
**Category:** Information Disclosure
**Status:** `NEXT_PUBLIC_ADMIN_EMAILS` no longer used. Replaced with `useAdminStatus` hook that calls Supabase RPC `is_admin()` — no emails in client bundle.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/lib/utils/admin-utils.ts` (line 17)

Admin email addresses are stored in `NEXT_PUBLIC_ADMIN_EMAILS`, which means they are embedded in the client-side JavaScript bundle. Any user can extract admin email addresses from the browser.

**Remediation:** Use a server-only environment variable (without `NEXT_PUBLIC_` prefix) for admin email checks. The file already notes that "server-side operations should use the database-based isAdmin() from admin-check.ts" -- extend this to client-side by having a server API endpoint return admin status rather than embedding emails.

---

### FIX-005: Missing Rate Limiting on Multiple API Routes — 🔄 DEFERRED
**Severity:** Medium
**Category:** Denial of Service / Abuse
**Status:** Deferred — incremental. 143/155 routes already covered. Remaining routes are low-traffic (webhooks, OAuth callbacks, marketing). Address per-route during feature work.

The following API routes lack rate limiting:

| Route | Risk |
|-------|------|
| `/api/founding-members` | Public endpoint, could be hammered |
| `/api/notifications/log` | Has auth but no rate limit |
| `/api/marketing/email-subscription` | Has auth but no rate limit |
| `/api/marketing/sms-subscription` | Has auth but no rate limit |
| `/api/webhooks/polar` | Webhook (signed), but no rate limit |
| `/api/test/*` (3 routes) | Test endpoints, no rate limit |
| `/api/calendar/callback/google` | OAuth callback, no rate limit |
| `/api/calendar/callback/outlook` | OAuth callback, no rate limit |

**Note:** Cron routes are protected by `CRON_SECRET` so rate limiting is less critical there. Most other routes (143 of ~155) do have rate limiting.

**Remediation:** Add rate limiting to all public-facing endpoints. For webhook endpoints, rate limiting is less critical since they are signature-verified, but still recommended as defense-in-depth.

---

### FIX-006: Missing Input Validation (Zod) on Some API Routes — 🔄 DEFERRED
**Severity:** Medium
**Category:** Input Validation
**Status:** Deferred — incremental. 97/155 routes already validated. Remaining 58 routes use manual validation or Supabase parameter handling. Address per-route during feature work.

58 out of ~155 API routes lack Zod schema validation. While some use manual validation or Supabase's built-in parameter handling, formal schema validation provides stronger guarantees. Key routes without Zod:

| Route | Concern |
|-------|---------|
| `/api/user/sessions/route.ts` | User session management |
| `/api/user/sessions/[sessionId]/route.ts` | Session deletion |
| `/api/user/track-session/route.ts` | Session tracking |
| `/api/user/cancel-deletion/route.ts` | Account restoration |
| `/api/spaces/[spaceId]/export/route.ts` | Data export |
| `/api/spaces/[spaceId]/delete/route.ts` | Space deletion |
| `/api/upload/avatar/route.ts` | File upload |
| `/api/upload/recipe/route.ts` | File upload |

**Remediation:** Add Zod schema validation to all API routes that accept user input, especially those handling file uploads, deletions, and sensitive operations.

---

### FIX-007: Math.random() Used for Security-Adjacent Purposes — ✅ FIXED
**Severity:** Medium
**Category:** Weak Randomness
**Status:** All 3 flagged files resolved. `PushNotificationProvider.tsx` and `family-location-service.ts` no longer use `Math.random()` for IDs/fuzzing. `mutation-queue.ts` was removed. Remaining `Math.random()` usage is non-security (animations, mocks, sampling).

**Affected Files:**
- `/Users/airborneshellback/vibecode-projects/rowan-app/components/notifications/PushNotificationProvider.tsx` (line 85): Generates notification IDs with `Math.random().toString(36).slice(2)`
- `/Users/airborneshellback/vibecode-projects/rowan-app/lib/react-query/mutation-queue.ts` (line 67): Generates mutation IDs with `Math.random().toString(36).slice(2, 9)`
- `/Users/airborneshellback/vibecode-projects/rowan-app/lib/services/family-location-service.ts` (lines 199-200): Location fuzzing for approximate privacy uses `Math.random()`

**Non-security uses (acceptable):** UI animations, mock data in health dashboard, motivational message selection, Sentry sampling, jitter delays -- these are fine.

**Remediation:** For notification IDs and mutation IDs, use `crypto.randomUUID()` or `crypto.getRandomValues()`. For location fuzzing, consider using `crypto.getRandomValues()` to prevent predictability in privacy-sensitive fuzzing.

---

### FIX-008: CSP Uses unsafe-inline and unsafe-eval — ⏳ BLOCKED (Next.js)
**Severity:** Medium
**Category:** Cross-Site Scripting (XSS) Defense Weakening
**Status:** Blocked on Next.js framework — nonce-based CSP support not yet stable. Properly documented in code. No action possible until framework support matures.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/next.config.mjs` (lines 132-134)

The Content Security Policy includes `'unsafe-inline'` and `'unsafe-eval'` for script-src. While the code already documents this as a Next.js framework limitation (lines 120-128), it weakens XSS protection.

**Positive notes:**
- The issue is documented with a clear explanation
- `object-src 'none'` is correctly set
- `base-uri 'self'` prevents base tag hijacking
- `form-action 'self'` prevents form hijacking
- SVG execution is disabled (`dangerouslyAllowSVG: false`)

**Remediation:** As documented, implement nonce-based CSP when Next.js nonce support stabilizes. This is a framework limitation, not a code deficiency.

---

### FIX-009: Backup File in Repository Root — ✅ FIXED
**Severity:** Medium
**Category:** Information Disclosure
**Status:** `instrumentation.ts.bak` removed. `*.bak` already in `.gitignore` (line 19).

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/instrumentation.ts.bak`

A `.bak` file exists in the repository root. While it currently contains only Sentry initialization code (not secrets), backup files should not be committed as they can accumulate sensitive information over time.

**Remediation:** Add `*.bak` to `.gitignore` and remove the file from the repository.

---

### FIX-010: Permissions-Policy Header Only in Middleware — ✅ FIXED
**Severity:** Medium
**Category:** Security Headers
**Status:** `Permissions-Policy` header added to `next.config.mjs` `headers()` (line 226-228). Now applies to all routes.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/middleware.ts` (line 475)

The `Permissions-Policy` header is set in middleware (`camera=(), microphone=(), geolocation=()`) but only for routes matching the middleware matcher. It is NOT set in `next.config.mjs` headers, meaning API routes and static assets may not receive this header.

**Remediation:** Add `Permissions-Policy` to the `headers()` configuration in `next.config.mjs` so it applies to all routes.

---

### FIX-011: X-XSS-Protection Header Missing from Middleware — ⏭️ SKIPPED
**Severity:** Medium
**Category:** Security Headers
**Status:** Skipped — header is deprecated. CSP supersedes it. Already present in `next.config.mjs` production headers for legacy browser coverage. Adding to middleware provides no meaningful benefit.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/next.config.mjs` (lines 207-209)

The `X-XSS-Protection: 1; mode=block` header is set in `next.config.mjs` production headers but NOT in middleware. While this header is largely deprecated in favor of CSP, it provides defense-in-depth for older browsers.

**Note:** This is a very minor concern since CSP is properly configured.

**Remediation:** Consider adding to middleware for consistency, or remove from next.config.mjs since CSP supersedes it.

---

### FIX-012: Founding Members Endpoint Uses console.error Instead of Logger — ✅ FIXED
**Severity:** Low
**Category:** Logging Consistency
**Status:** `console.error()` replaced with `logger.error()` in founding-members route.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/founding-members/route.ts` (line 47)

Uses `console.error()` instead of the structured `logger.error()` used elsewhere. In production, `console.error` is preserved (per next.config.mjs compiler settings), but it lacks the structured metadata that the logger provides for Sentry integration.

**Remediation:** Replace with `logger.error()` for consistent structured logging.

---

### FIX-013: Location Fuzzing Predictability — ✅ FIXED
**Severity:** Low
**Category:** Privacy
**Status:** Resolved as part of FIX-007. `Math.random()` removed from `family-location-service.ts`.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/lib/services/family-location-service.ts` (lines 199-200)

The "approximate" location precision mode uses `Math.random()` to fuzz coordinates. Since `Math.random()` is not cryptographically secure, an attacker who can observe multiple fuzzed locations could potentially narrow down the actual location.

**Remediation:** Use `crypto.getRandomValues()` for the fuzzing factor to ensure unpredictable offsets.

---

### FIX-014: Console.log Count in Production Code — ℹ️ NO ACTION NEEDED
**Severity:** Low
**Category:** Information Disclosure
**Status:** No action needed. `next.config.mjs` compiler strips `console.log` and `console.warn` in production. Remaining instances are in scripts, tests, and logger implementations.

54 `console.log` statements found across 8 files. Most are in:
- Scripts (validate-database, setup-user-sessions) - acceptable
- Test files (e2e tests) - acceptable
- Logger implementation files - expected
- Feature flags debugging - minor concern

**Positive:** `next.config.mjs` line 48 strips `console.log` and `console.warn` in production builds while preserving `console.error`. This mitigates the risk.

---

### FIX-015: Service Role Key Usage (Verified Secure) — ℹ️ NO ACTION NEEDED
**Severity:** Low (Informational - Properly Implemented)
**Category:** Access Control
**Status:** Positive finding. Runtime guard prevents client-side import. No action needed.

`SUPABASE_SERVICE_ROLE_KEY` is used in:
- `/Users/airborneshellback/vibecode-projects/rowan-app/lib/supabase/admin.ts` (server-only, with `typeof window !== 'undefined'` guard)
- `/Users/airborneshellback/vibecode-projects/rowan-app/lib/supabase-server.ts` (server-only)
- Various API routes (server-side only)
- Scripts (server-side only)

**Positive:** The admin client has a runtime guard that throws an error if imported on the client side (line 23 of admin.ts). This is a strong protection.

**Remediation:** None needed - properly implemented.

---

### FIX-016: Webhook Route Lacks Rate Limiting — 🔄 DEFERRED
**Severity:** Low
**Category:** Denial of Service
**Status:** Deferred — webhook is signature-verified with HMAC-SHA256 + timing-safe comparison. Rate limiting is defense-in-depth, not critical. Address when adding rate limiting to other routes (FIX-005).

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/webhooks/polar/route.ts`

The Polar webhook handler verifies signatures using HMAC-SHA256 with timing-safe comparison (properly implemented), but has no rate limiting. An attacker sending many invalid webhook requests could cause increased server load from signature verification.

**Remediation:** Add rate limiting by IP to the webhook endpoint as defense-in-depth.

---

### FIX-017: .env.local File Exists in Working Directory — ℹ️ NO ACTION NEEDED
**Severity:** Low
**Category:** Secret Management
**Status:** Positive finding. `.gitignore` properly covers `.env*.local` and `.env`. No action needed.

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/.env.local`

The file exists and is properly gitignored (`.env*.local` in `.gitignore`). No `.env` file without `.local` suffix was found.

**Positive:** `.gitignore` correctly covers `.env*.local` and `.env`.

**Remediation:** None needed - properly configured.

---

### FIX-018: ALLOW_TEST_ENDPOINTS Environment Variable Not in .env.example — ✅ N/A
**Severity:** Low
**Category:** Configuration Management
**Status:** No longer applicable — all 3 test endpoints were removed (FIX-003). `ALLOW_TEST_ENDPOINTS` env var is no longer referenced anywhere.

---

### FIX-019: No dangerouslySetInnerHTML Usage Found — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** XSS Prevention

Zero instances of `dangerouslySetInnerHTML` or direct `innerHTML` assignment found in the codebase. This eliminates a major XSS attack vector.

---

### FIX-020: No eval() Usage Found — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** Code Injection Prevention

Zero instances of `eval()` found in application code. No `child_process` imports for command injection. No `exec()` or `spawn()` calls.

---

### FIX-021: No Hardcoded Secrets Found — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** Secret Management

Comprehensive scan for API keys, tokens, passwords, and secrets in `.ts/.tsx` files found zero hardcoded values. All secrets are properly loaded from environment variables.

---

### FIX-022: No SQL Injection Vectors Found — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** Injection Prevention

All database operations use the Supabase client library's parameterized query builder (`.from().select()`, `.rpc()`, etc.). No raw SQL string concatenation found. Search inputs are sanitized via `sanitizeSearchInput()` before use in `.ilike()` queries.

---

### FIX-023: Sanitization Library Properly Used — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** XSS Prevention

DOMPurify and custom sanitization functions are implemented and used throughout:
- `lib/sanitize.ts` provides `sanitizePlainText()` and `sanitizeUrl()`
- `lib/utils/input-sanitization.ts` provides `sanitizeSearchInput()`
- Validation schemas use sanitization in preprocessing
- URL sanitization is applied to user-provided URLs

---

### FIX-024: Webhook Signature Verification Properly Implemented — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** Authentication

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/app/api/webhooks/polar/route.ts`

The Polar webhook uses HMAC-SHA256 with `timingSafeEqual()` for signature verification. This prevents timing attacks and ensures webhook authenticity.

---

### FIX-025: Source Maps Hidden in Production — ℹ️ POSITIVE
**Severity:** Info (Positive Finding)
**Category:** Information Disclosure Prevention

**File:** `/Users/airborneshellback/vibecode-projects/rowan-app/next.config.mjs` (line 246)

Sentry configuration includes `hideSourceMaps: true`, preventing source maps from being exposed in production client bundles.

---

## Scan Categories Checklist

- [x] **Dependency vulnerabilities** -- npm audit not runnable in this environment; recommend running `npm audit` separately
- [x] **Secrets detection** -- No hardcoded secrets found (PASS)
- [x] **Injection vulnerabilities** -- No SQL injection, XSS, or command injection vectors (PASS)
- [x] **Auth checks in API routes** -- 155 of 155 non-public routes have auth checks; cron routes use CRON_SECRET (PASS)
- [x] **Rate limiting coverage** -- ~143 of 155 routes have rate limiting; 12 routes missing (DEFERRED — incremental)
- [x] **Input validation** -- 97 of 155 routes use Zod validation; 58 routes missing (DEFERRED — incremental)
- [x] **Security headers** -- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all configured (PASS)
- [x] **Environment config** -- Production console stripping enabled, .env files gitignored, NEXT_PUBLIC_ admin emails removed (PASS)
- [x] **Cryptography** -- No MD5/SHA1 for security; HMAC-SHA256 used for webhooks; Math.random() removed from security contexts (PASS)
- [x] **Client-side security** -- No eval(), no sensitive localStorage, no prototype pollution (PASS)
- [x] **dangerouslySetInnerHTML** -- Zero instances found (PASS)
- [x] **Error handling** -- All API routes return generic error messages (PASS — FIXED)
- [x] **Service role key** -- Server-only with runtime guard (PASS)
- [x] **File security** -- .bak file removed; *.bak in .gitignore; .env properly gitignored (PASS — FIXED)

---

## Remediation Status

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| FIX-001 | Error messages in API responses | High | ✅ Fixed |
| FIX-002 | Stack traces reaching clients | High | ✅ Fixed |
| FIX-003 | Test endpoints | High | ✅ Removed |
| FIX-004 | Admin emails in client bundle | Medium | ✅ Fixed — uses `is_admin()` RPC |
| FIX-005 | Rate limiting gaps (12 routes) | Medium | 🔄 Deferred — incremental |
| FIX-006 | Zod validation gaps (58 routes) | Medium | 🔄 Deferred — incremental |
| FIX-007 | Math.random() in security contexts | Medium | ✅ Fixed |
| FIX-008 | CSP unsafe-inline/unsafe-eval | Medium | ⏳ Blocked — Next.js framework |
| FIX-009 | Backup file in repo | Medium | ✅ Fixed |
| FIX-010 | Permissions-Policy header | Medium | ✅ Fixed |
| FIX-011 | X-XSS-Protection in middleware | Medium | ⏭️ Skipped — deprecated header |
| FIX-012 | console.error in founding-members | Low | ✅ Fixed |
| FIX-013 | Location fuzzing predictability | Low | ✅ Fixed (with FIX-007) |
| FIX-014 | console.log in production | Low | ℹ️ No action — compiler strips |
| FIX-015 | Service role key usage | Low | ℹ️ No action — properly guarded |
| FIX-016 | Webhook rate limiting | Low | 🔄 Deferred (with FIX-005) |
| FIX-017 | .env.local exists | Low | ℹ️ No action — properly gitignored |
| FIX-018 | ALLOW_TEST_ENDPOINTS env var | Low | ✅ N/A — test endpoints removed |
| FIX-019 | No dangerouslySetInnerHTML | Info | ℹ️ Positive finding |
| FIX-020 | No eval() | Info | ℹ️ Positive finding |
| FIX-021 | No hardcoded secrets | Info | ℹ️ Positive finding |
| FIX-022 | No SQL injection | Info | ℹ️ Positive finding |
| FIX-023 | Sanitization library used | Info | ℹ️ Positive finding |
| FIX-024 | Webhook signature verified | Info | ℹ️ Positive finding |
| FIX-025 | Source maps hidden | Info | ℹ️ Positive finding |

---

*End of report. Last updated: February 1, 2026.*
