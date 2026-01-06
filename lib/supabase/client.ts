import { createBrowserClient } from '@supabase/ssr';

// Singleton client instance to prevent multiple GoTrueClient instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

// Track whether we're using placeholder values (build time)
let isPlaceholder = false;

// Session cookie duration: 1 year (persistent login like Facebook/Instagram)
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 31536000 seconds

export const createClient = () => {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  // Use placeholder values during build time if env vars aren't available
  // The client will fail at runtime if used without proper env vars,
  // but this allows the build to succeed in CI environments
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In browser context with missing vars, throw (user will see the error)
  // During build time (server context), use placeholder to allow build to complete
  if (isPlaceholder && typeof window !== 'undefined') {
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

        // Set cookie in document with persistent login (1 year default)
        let cookie = `${name}=${value}`;
        // Use provided maxAge or default to 1 year for persistent login
        const maxAge = options?.maxAge || SESSION_COOKIE_MAX_AGE;
        cookie += `; max-age=${maxAge}`;
        cookie += `; path=${options?.path || '/'}`;
        if (options?.domain) {
          cookie += `; domain=${options.domain}`;
        }
        cookie += `; samesite=${options?.sameSite || 'lax'}`;
        // Always use secure in production
        if (options?.secure || (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
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
      // Note: Removed Content-Type header - it interferes with storage uploads
      // Storage uploads need multipart/form-data or specific MIME types, not application/json
      headers: {
        'Accept': 'application/json',
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

// Helper to check if client is properly configured (not using placeholders)
export function isSupabaseClientConfigured(): boolean {
  return !isPlaceholder;
}
