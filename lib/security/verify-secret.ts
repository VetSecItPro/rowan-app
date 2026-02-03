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
 * @param authHeader - The full Authorization header value (e.g., "Bearer abc123")
 * @param cronSecret - The expected CRON_SECRET value
 * @returns true if the bearer token matches, false otherwise
 */
export function verifyCronSecret(authHeader: string | null, cronSecret: string | undefined): boolean {
  if (!authHeader || !cronSecret) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return verifySecret(token, cronSecret);
}
