import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WelcomeForm } from './WelcomeForm';

// Authenticated dynamic page — never statically generate.
export const dynamic = 'force-dynamic';

/**
 * /welcome — post-signup confirmation step.
 *
 * Behaviour:
 *   - Unauthenticated → bounce to /login.
 *   - Already completed (welcome_completed_at non-NULL) → bounce to /dashboard
 *     so existing users can't get stuck in a redirect loop or revisit the flow.
 *   - Otherwise render the form pre-filled with the auto-derived values.
 *
 * Invited partners are kept off this page by the (main) layout guard, but if
 * one ever reaches it directly we still let them edit their display name and
 * skip — the API will refuse to rename a space they don't own.
 */
export default async function WelcomePage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // nosemgrep: supabase-missing-space-id-filter — `users` is a global per-user table; .eq('id', authUser.id) is the canonical access pattern (rule lists profiles/spaces/etc. as global-table exceptions; users is in the same class)
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, welcome_completed_at')
    .eq('id', authUser.id)
    .single();

  if (profile?.welcome_completed_at) {
    redirect('/dashboard');
  }

  // Find the user's primary owned space — that's the household name we let
  // them edit. If they don't own a space (invited partner who somehow landed
  // here), we still render but pass null so the form hides the household field.
  const { data: ownedSpace } = await supabase
    .from('space_members')
    .select('spaces:space_id ( id, name )')
    .eq('user_id', authUser.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();

  // Supabase typing for the embedded relation can come back as either a single
  // object or an array depending on the join shape — normalize both forms.
  const rawSpace = (ownedSpace as { spaces?: unknown } | null)?.spaces;
  const spaceRow = Array.isArray(rawSpace) ? rawSpace[0] : rawSpace;
  const spaceName =
    spaceRow && typeof spaceRow === 'object' && 'name' in spaceRow
      ? (spaceRow as { name: string }).name
      : null;

  return (
    <WelcomeForm
      initialName={profile?.name ?? ''}
      initialSpaceName={spaceName}
    />
  );
}
