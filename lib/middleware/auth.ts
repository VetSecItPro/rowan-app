import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

// SECURITY: 90-day session duration — FIX-024
const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 7776000 seconds

export interface AuthSession {
  user: User;
}

export interface AuthResult {
  response: NextResponse;
  session: AuthSession | null;
}

/**
 * Creates a Supabase middleware client with persistent cookie management and validates
 * the user via server-side JWT verification (getUser, not getSession).
 *
 * Returns the NextResponse (with any refreshed auth cookies applied) and the session.
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
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const persistentOptions = {
            ...options,
            maxAge: options.maxAge || SESSION_COOKIE_MAX_AGE,
            path: options.path || '/',
            sameSite: options.sameSite || 'lax',
            secure: options.secure ?? process.env.NODE_ENV === 'production',
          };
          req.cookies.set({ name, value, ...persistentOptions });
          response = NextResponse.next({ request: { headers: sanitizedHeaders } });
          response.cookies.set({ name, value, ...persistentOptions });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: sanitizedHeaders } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const session: AuthSession | null = authUser ? { user: authUser } : null;

  return { response, session };
}
