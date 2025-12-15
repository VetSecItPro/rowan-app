import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Check if the currently authenticated user is an admin
 * Uses the database is_admin() RPC function which checks admin_users table
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Use RPC call to is_admin() function which has SECURITY DEFINER
    // This bypasses RLS and checks admin_users table securely
    const { data, error } = await supabase.rpc('is_admin');

    if (error) {
      logger.error('Error checking admin status', error, { component: 'admin-check', action: 'is_admin' });
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if a given user ID belongs to an admin
 * Uses the database is_admin() RPC function with explicit user_id
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Use RPC call with explicit user_id parameter
    const { data, error } = await supabase.rpc('is_admin', { user_id: userId });

    if (error) {
      logger.error('Error checking admin status for user', error, { component: 'admin-check', action: 'is_user_admin' });
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}
