import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
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
