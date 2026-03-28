import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AuthSession } from './auth';

/**
 * Email verification enforcement cutoff date.
 * Users who signed up BEFORE this date are grandfathered in (no verification required).
 * Set to: January 4, 2026 (grandfathering all beta users).
 */
const EMAIL_VERIFICATION_CUTOFF = new Date('2026-01-04T00:00:00Z');

const VERIFICATION_PATHS = ['/verify-email', '/api/auth/resend-verification'];

/**
 * Enforces email verification for new users on protected routes.
 * Returns a redirect response to /verify-email, or null if no enforcement needed.
 */
export function checkEmailVerification(
  req: NextRequest,
  pathname: string,
  session: AuthSession | null,
): NextResponse | null {
  if (!session?.user) return null;

  const { user } = session;
  const userCreatedAt = user.created_at ? new Date(user.created_at) : null;
  const isNewUser = userCreatedAt && userCreatedAt >= EMAIL_VERIFICATION_CUTOFF;

  if (!isNewUser) return null;
  if (user.email_confirmed_at) return null;
  // Exempt E2E test users from email verification
  if (user.email?.endsWith('@rowan-test.app')) return null;

  const isVerificationPath = VERIFICATION_PATHS.some(p => pathname.startsWith(p));
  if (isVerificationPath) return null;

  // FIX-052: Do not expose user email in redirect URL query parameter
  return NextResponse.redirect(new URL('/verify-email', req.url));
}
