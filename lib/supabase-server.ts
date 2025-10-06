import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role
// This bypasses RLS and should ONLY be used in server-side code (lib/services)
// NEVER import this in client components

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
