import { supabase } from './supabase';

/**
 * Development helper to set user context for RLS policies
 * This allows RLS to work with the mock auth context during development
 *
 * In production with real Supabase auth, auth.uid() will be used instead
 */
export async function setUserContext(userId: string) {
  // Set custom user context for RLS policies
  await supabase.rpc('set_config', {
    setting_name: 'app.current_user_id',
    setting_value: userId,
    is_local: true
  });
}

/**
 * Get Supabase client with user context set
 * Use this in services when working with RLS-protected tables
 */
export async function getSupabaseWithContext(userId: string) {
  await setUserContext(userId);
  return supabase;
}

export { supabase };
