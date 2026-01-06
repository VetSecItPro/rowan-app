import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { logger } from '@/lib/logger';

/** User session cookie duration: 1 year (persistent login like Facebook/Instagram) */
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 31536000 seconds

/**
 * Creates an async Supabase client for server-side use (API routes, Server Actions, Route Handlers).
 * In Next.js 15+, cookies() returns a Promise, so this function must be async.
 *
 * Usage: const supabase = await createClient();
 */
export async function createClient() {
  // Runtime check to prevent execution during build time
  if (typeof window !== 'undefined') {
    throw new Error('Server client called in browser context');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or when env vars are missing, return a mock client to prevent errors
    logger.warn('Missing Supabase environment variables, using mock client during build', { component: 'lib-server' });
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null }),
        update: () => ({ data: [], error: null }),
        delete: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
      }),
      auth: {
        getUser: () => ({ data: { user: null }, error: null }),
        getSession: () => ({ data: { session: null }, error: null }),
        signUp: () => ({ data: { user: null }, error: null }),
        signInWithPassword: () => ({ data: { user: null }, error: null }),
        signOut: () => ({ error: null }),
      },
      rpc: () => ({ data: null, error: null }),
    } as any;
  }

  // In Next.js 15+, cookies() returns a Promise - must await it
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Apply persistent login: 1 year cookie expiration for auth cookies
            const persistentOptions: Partial<ResponseCookie> = {
              ...options,
              maxAge: options?.maxAge || SESSION_COOKIE_MAX_AGE,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
            };
            cookieStore.set(name, value, persistentOptions);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
