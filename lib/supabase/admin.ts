/**
 * ADMIN SUPABASE CLIENT
 *
 * ⚠️ WARNING: This client bypasses ALL RLS policies
 *
 * ONLY use this in:
 * - API routes
 * - Server-side code
 * - Database migrations
 * - Admin operations
 *
 * NEVER import this in:
 * - Client components
 * - Pages
 * - Hooks
 *
 * Use lib/supabase/client.ts for client-side operations
 */

import { createClient } from '@supabase/supabase-js';

// Runtime check to prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error(
    'Admin Supabase client cannot be used on the client side. Use createClient from lib/supabase/client.ts instead.'
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

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});