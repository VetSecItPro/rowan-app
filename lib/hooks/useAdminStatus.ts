'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Client-side admin status check via Supabase RPC
 *
 * Replaces NEXT_PUBLIC_ADMIN_EMAILS to avoid exposing admin emails
 * in the client-side JavaScript bundle. Uses the is_admin() database
 * function which checks the admin_users table.
 */
export function useAdminStatus(userId: string | undefined) {
  return useQuery<boolean>({
    queryKey: ['auth', 'admin-status', userId],
    queryFn: async (): Promise<boolean> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('is_admin');
      if (error) return false;
      return data === true;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
