import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';

export const createClient = () => {
  // Runtime check to prevent execution during build time
  if (typeof window !== 'undefined') {
    throw new Error('Server client called in browser context');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or when env vars are missing, return a mock client to prevent errors
    console.warn('Missing Supabase environment variables, using mock client during build');
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
        signUp: () => ({ data: { user: null }, error: null }),
        signInWithPassword: () => ({ data: { user: null }, error: null }),
      },
      rpc: () => ({ data: null, error: null }),
    } as any;
  }

  // Safely get cookies with error handling
  let cookieStore;
  try {
    cookieStore = (cookies() as unknown as UnsafeUnwrappedCookies);
  } catch (error) {
    // During build time, provide a mock cookie store
    console.warn('Cookies not available during build time, using mock store');
    cookieStore = {
      get: () => undefined,
      set: () => {},
      delete: () => {}
    };
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
