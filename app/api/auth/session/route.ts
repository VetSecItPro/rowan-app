import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/session
 *
 * Lightweight authenticated-session verifier. Returns 200 with the
 * authenticated user's id+email when the request carries a valid Supabase
 * session, and 401 otherwise.
 *
 * Why this route exists: the E2E auth-setup harness used to verify auth by
 * calling GET /api/csrf/token, but that route does NOT call getUser() — it
 * only rate-limits and returns a CSRF token. A 200 there meant "rate-limit
 * OK," not "session valid." False positives leaked into the saved storage
 * state, which is the documented Phase 8.1 root cause for test-pro session
 * intermittency in CI (see rowan-backlog.md Phase 8.1).
 *
 * This route is the real verifier — it calls supabase.auth.getUser() (the
 * same JWT-validating call proxy.ts already runs in middleware), so a 200
 * here is a structural guarantee that subsequent state-changing requests
 * with the same cookies will succeed.
 *
 * Not rate-limited: the request itself is rate-limited via proxy.ts's
 * middleware-level getUser() call. Adding another rate limit here would
 * recreate the per-IP collision class this PR is trying to fix.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return NextResponse.json(
      { authenticated: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: { id: data.user.id, email: data.user.email },
  });
}
