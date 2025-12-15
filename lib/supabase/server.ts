import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { logger } from '@/lib/logger';

export const createClient = () => {
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
        signUp: () => ({ data: { user: null }, error: null }),
        signInWithPassword: () => ({ data: { user: null }, error: null }),
      },
      rpc: () => ({ data: null, error: null }),
    } as any;
  }

  // In Next.js 15+, cookies() returns a Promise, but we use React.use() to unwrap it
  // This is a server-only module, so we can safely import React here
  const React = require('react');
  const cookieStore = React.use(cookies());

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
