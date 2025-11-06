import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
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
        getSession: () => ({ data: { session: null }, error: null }),
        signUp: () => ({ data: { user: null }, error: null }),
        signInWithPassword: () => ({ data: { user: null }, error: null }),
        updateUser: () => ({ data: { user: null }, error: null }),
        signOut: () => ({ error: null }),
      },
      rpc: () => ({ data: null, error: null }),
      channel: () => ({
        on: () => ({
          subscribe: () => {},
        }),
      }),
      removeChannel: () => {},
    } as any;
  }

  // Create a new client each time to ensure fresh session state
  // This allows the client to pick up authentication changes
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        // Only access document in browser environment
        if (typeof window === 'undefined') return undefined;

        // Get cookie from document (reads current session)
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      },
      set(name: string, value: string, options: any) {
        // Only access document in browser environment
        if (typeof window === 'undefined') return;

        // Set cookie in document
        let cookie = `${name}=${value}`;
        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`;
        }
        if (options?.path) {
          cookie += `; path=${options.path}`;
        }
        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }
        if (options?.sameSite) {
          cookie += `; samesite=${options.sameSite}`;
        }
        if (options?.secure) {
          cookie += '; secure';
        }
        document.cookie = cookie;
      },
      remove(name: string, options: any) {
        // Only access document in browser environment
        if (typeof window === 'undefined') return;

        // Remove cookie by setting expired date
        let cookie = `${name}=; max-age=0`;
        if (options?.path) {
          cookie += `; path=${options.path}`;
        }
        document.cookie = cookie;
      },
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });
};
