import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side auth helper for Server Component pages.
 *
 * Verifies the user via server-side JWT validation (getUser, not getSession).
 * Redirects to /login if unauthenticated, /onboarding if no space.
 *
 * Usage in a Server Component page:
 * ```ts
 * export default async function MyPage() {
 *   const { userId, spaceId } = await serverAuth();
 *   return <MyClientComponent spaceId={spaceId} />;
 * }
 * ```
 */
export async function serverAuth(): Promise<{ userId: string; spaceId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: spaceMember } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!spaceMember) {
    redirect('/onboarding');
  }

  return { userId: user.id, spaceId: spaceMember.space_id };
}
