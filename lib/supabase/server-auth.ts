import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side auth helper for Server Component pages.
 *
 * Verifies the user is authenticated and has an active space.
 * Redirects to /login if no session, /onboarding if no space.
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: spaceMember } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', session.user.id)
    .limit(1)
    .single();

  if (!spaceMember) {
    redirect('/onboarding');
  }

  return { userId: session.user.id, spaceId: spaceMember.space_id };
}
