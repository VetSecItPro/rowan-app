import { createBrowserClient } from '@supabase/ssr';

// Singleton client instance to prevent multiple GoTrueClient instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create singleton client instance
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
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
      fetch: (url, options = {}) => {
        // Add timeout to all Supabase requests to prevent hanging
        const timeoutDuration = 15000; // 15 second timeout

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutDuration);

        const fetchWithTimeout = fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        return fetchWithTimeout;
      },
    },
  });

  return supabaseClient;
};
