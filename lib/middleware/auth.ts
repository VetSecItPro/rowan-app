import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// SECURITY: 90-day session duration — FIX-024
const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 7776000 seconds

export interface AuthSession {
  user: User;
}

export interface AuthResult {
  response: NextResponse;
  session: AuthSession | null;
  supabase: SupabaseClient;
}

/**
 * Creates a Supabase middleware client with persistent cookie management and validates
 * the user via server-side JWT verification (getUser, not getSession).
 *
 * Returns the NextResponse (with any refreshed auth cookies applied) and the session.
 *
 * Uses the recommended getAll/setAll cookie pattern from @supabase/ssr.
 *
 * PERF: getUser() validates JWT server-side on every request (50-200ms). Intentional
 * security trade-off — FIX-016 accepted risk.
 */
export async function initAuth(req: NextRequest, sanitizedHeaders: Headers): Promise<AuthResult> {
  let response = NextResponse.next({ request: { headers: sanitizedHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          // Apply cookies to the request (for downstream middleware/server components)
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          // Recreate response to pick up updated request cookies
          response = NextResponse.next({ request: { headers: sanitizedHeaders } });

          // Apply cookies to the response (sent back to browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              maxAge: (options?.maxAge as number) || SESSION_COOKIE_MAX_AGE,
              path: (options?.path as string) || '/',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') || 'lax',
              secure: (options?.secure as boolean) ?? process.env.NODE_ENV === 'production',
            });
          });
        },
      },
    }
  );

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const session: AuthSession | null = authUser ? { user: authUser } : null;

  return { response, session, supabase };
}
