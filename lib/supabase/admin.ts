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

// Use dummy values during build time if env vars aren't available
// The client will fail at runtime if used without proper env vars,
// but this allows the build to succeed in CI environments
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Track whether we're using placeholder values
const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to check if admin client is properly configured
export function isSupabaseAdminConfigured(): boolean {
  return !isPlaceholder;
}