import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe secret comparison for cron route authentication.
 *
 * Uses crypto.timingSafeEqual to prevent timing-based side-channel attacks
 * that could allow an attacker to guess the secret one character at a time.
 *
 * @param provided - The secret value provided in the request (e.g., from Authorization header)
 * @param expected - The expected secret value (e.g., from environment variable)
 * @returns true if both secrets match, false otherwise
 */
export function verifySecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verify a Bearer token from an Authorization header against CRON_SECRET.
 *
 * Extracts the token from "Bearer <token>" format and compares it
 * using timing-safe comparison.
 *
 * All cron routes send: `Authorization: Bearer <CRON_SECRET>`. Vercel Cron
 * automatically injects this header when the `CRON_SECRET` env var is set in
 * the project settings. On Vercel, the cron infrastructure also sends the
 * `x-vercel-cron-signature` header for additional verification; however, that
 * header requires the raw request body and HMAC-SHA256, which is incompatible
 * with Next.js route handlers that consume the body stream. The Bearer token
 * check is therefore the authoritative gate for all cron routes.
 *
 * SECURITY RECOMMENDATION — Secret rotation:
 *   Rotate CRON_SECRET periodically (every 90 days) and immediately after any
 *   suspected exposure. Update the value in both Vercel project settings and
 *   any external schedulers before the old value is retired.
 *
 * @param authHeader - The full Authorization header value (e.g., "Bearer abc123")
 * @param cronSecret - The expected CRON_SECRET value
 * @returns true if the bearer token matches, false otherwise
 */
export function verifyCronSecret(authHeader: string | null, cronSecret: string | undefined): boolean {
  if (!authHeader || !cronSecret) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return verifySecret(token, cronSecret);
}
