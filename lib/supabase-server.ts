import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SECURITY WARNING: SERVER-SIDE ONLY
// ============================================================================
// This file creates a Supabase client with the SERVICE_ROLE_KEY which:
// - Bypasses ALL Row Level Security (RLS) policies
// - Has full read/write access to the entire database
// - Should NEVER be imported in client components
// - Should NEVER be exposed to the browser
// ============================================================================

// SECURITY: Runtime check to prevent accidental client-side import
// This check runs at module load time and will crash the app if
// this module is ever bundled into client-side code
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY ERROR: supabase-server.ts cannot be used on the client side. ' +
    'Use @/lib/supabase/client.ts instead. If you see this error, check your imports.'
  );
}

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
