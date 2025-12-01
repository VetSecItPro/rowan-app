import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'vetsecitpro@gmail.com';

/**
 * Check if the currently authenticated user is an admin
 * Admin is determined by email address match
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return false;
  }

  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if a given user ID belongs to an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return false;
  }

  return user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get admin email (for backend use)
 */
export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}
