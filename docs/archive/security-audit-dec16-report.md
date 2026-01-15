# Rowan App Security Audit (Static, No-Fix)

Date: 2025-12-16
Scope: repository source code + configuration (static analysis only)

## What this is
Best-effort static security review of the codebase. No fixes were applied.

## What this is not
- Not a penetration test.
- Not a dependency/CVE audit (no vulnerability DB lookups; network access restricted).
- Not a guarantee that unlisted vulns do not exist.

## High-level metrics
- API route files: 149 (see docs/security-audit/2025-12-16/api_routes_all.txt)
- State-changing API routes (POST/PUT/PATCH/DELETE): 100 (see docs/security-audit/2025-12-16/api_routes_state_changing.txt)
- Routes that explicitly validate CSRF tokens via validateCsrfRequest: 12 (see docs/security-audit/2025-12-16/api_routes_csrf_token_validated.txt)
- State-changing routes missing CSRF-token validation: 88 (see docs/security-audit/2025-12-16/api_routes_state_changing_missing_csrf_token_validation.txt)
- Service-role key usage occurrences (files): 7 (see docs/security-audit/2025-12-16/service_role_key_usage.txt)
- Routes with explicit CORS headers: 1 (see docs/security-audit/2025-12-16/api_routes_cors_headers.txt)
- API route fetch() occurrences: 13 (see docs/security-audit/2025-12-16/api_routes_fetch_calls.txt)
- Test endpoints: 3 (see docs/security-audit/2025-12-16/test_endpoints.txt)

## CRITICAL findings

### C1. Unprotected test email endpoint can send emails to arbitrary addresses
Why it matters: /api/test/email-templates can be abused for spam/phishing, cost burn, and domain reputation damage.
Evidence: app/api/test/email-templates/route.ts (no prod guard, no auth, sends emails)

### C2. Test cookies endpoint leaks cookie metadata
Why it matters: /api/test-cookies prints cookie names and raw cookie fragments; in prod this is information disclosure.
Evidence: app/api/test-cookies/route.ts (no prod guard)

### C3. CSRF enforcement is inconsistent across state-changing routes
You have double-submit CSRF utilities (lib/security/csrf.ts + lib/security/csrf-validation.ts), but only a small subset of state-changing routes use validateCsrfRequest.
Why it matters: relying on middleware Origin checks alone is brittle and increases regression risk.
Evidence: 12 routes validate CSRF tokens out of 100 state-changing routes.
Full list: docs/security-audit/2025-12-16/api_routes_state_changing_missing_csrf_token_validation.txt

### C4. /api/auth/signin returns full Supabase session object in JSON
Why it matters: Supabase session objects typically include bearer access and refresh tokens; returning them increases token exposure risk.
Evidence: app/api/auth/signin/route.ts:85

### C5. ICS import URL validation allows http:// and does not block private-network SSRF targets
Why it matters: http:// permits MITM; not blocking RFC1918/link-local/metadata IP ranges allows SSRF if attackers can set feed URLs.
Evidence: lib/services/calendar/ics-import-service.ts:58-59

## HIGH findings

### H1. Middleware does not treat /api/admin/* as admin paths
Why it matters: admin API endpoints must consistently enforce admin auth on their own; any missing checks would be critical.
Evidence: middleware.ts admin check uses pathname.startsWith("/admin"), not /api/admin

### H2. Service-role Supabase clients exist with placeholder fallbacks
Why it matters: placeholder fallbacks increase misconfiguration blast radius and can create confusing failure modes.
Evidence: lib/supabase-server.ts:26-27 and lib/supabase/admin.ts:32-33

### H3. CORS wildcard in OCR OPTIONS handler
Why it matters: currently likely safe if no credentials are allowed, but it is a footgun if auth mode changes.
Evidence: app/api/ocr/scan-receipt/route.ts (see api_routes_cors_headers.txt)

## MEDIUM findings

### M1. CSP allows unsafe-inline and unsafe-eval
Why it matters: weakens XSS mitigation.
Evidence: next.config.mjs CSP and middleware.ts CSP

### M2. Duplicate CSP sources (next.config.mjs + middleware)
Why it matters: conflicting policies can be accidentally weakened or cause hard-to-debug breakage.

### M3. Service worker caches app data and replays queued requests
Why it matters: cached app state is readable to any JS on-origin (XSS amplification). Also SW POSTs omit CSRF headers.
Evidence: public/sw.js message handlers CACHE_DATA and SYNC_OFFLINE_QUEUE

## LOW / informational

### L1. Logger redaction is key-based, not value-based
Why it matters: tokens embedded in free-form strings will not be redacted.
Evidence: lib/logger.ts

## Appendices (full inventories)
- docs/security-audit/2025-12-16/api_routes_all.txt
- docs/security-audit/2025-12-16/api_routes_state_changing.txt
- docs/security-audit/2025-12-16/api_routes_csrf_token_validated.txt
- docs/security-audit/2025-12-16/api_routes_state_changing_missing_csrf_token_validation.txt
- docs/security-audit/2025-12-16/service_role_key_usage.txt
- docs/security-audit/2025-12-16/test_endpoints.txt
- docs/security-audit/2025-12-16/api_routes_cors_headers.txt
- docs/security-audit/2025-12-16/api_routes_fetch_calls.txt
- docs/security-audit/2025-12-16/dangerous_sinks_grep.txt
- docs/security-audit/2025-12-16/secrets_like_patterns.txt

---
Generated without fixing code.

## Complete findings inventory (exhaustive)

For the full per-endpoint audit surface, see:
- docs/security-audit/2025-12-16/api_route_security_matrix.csv (149 rows; includes heuristic flags)
- docs/security-audit/2025-12-16/api_route_flags.md (routes grouped by heuristic flag)

Sorting guidance (to get a ranked full list):
- Critical: TEST_ENDPOINT, RETURNS_SESSION_OBJECT
- High: USES_SERVICE_ROLE_KEY, CORS_HEADERS_PRESENT
- Medium: STATE_CHANGE_NO_CSRF_TOKEN_VALIDATION, FETCH_USED
- Investigate: STATE_CHANGE_NO_AUTH_CHECK_DETECTED (heuristic; may include endpoints using non-Supabase auth checks)
