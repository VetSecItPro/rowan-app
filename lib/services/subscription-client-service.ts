/**
 * Client-side subscription helpers.
 * For lightweight checks in client components (e.g., payment success polling).
 * The authoritative server-side logic lives in subscription-service.ts.
 */
import { createClient } from '@/lib/supabase/client';

/**
 * Check if the current user has an active paid subscription.
 * Suitable for client-side polling after payment (relies on RLS).
 */
export async function checkSubscriptionActive(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.status === 'active' && data?.tier !== 'free';
  } catch {
    return false;
  }
}
