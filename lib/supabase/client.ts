import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to prevent multiple GoTrueClient instances
let client: SupabaseClient | null = null;

export const createClient = () => {
  // Return existing client if already created (singleton pattern)
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create and store the client with proper cookie handling for SSR
  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        // Get cookie from document
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      },
      set(name: string, value: string, options: any) {
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
        // Remove cookie by setting expired date
        let cookie = `${name}=; max-age=0`;
        if (options?.path) {
          cookie += `; path=${options.path}`;
        }
        document.cookie = cookie;
      },
    },
  });

  return client;
};
