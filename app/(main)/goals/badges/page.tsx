import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserFirstSpaceId } from '@/lib/services/spaces-service';
import BadgeCollection from '@/components/goals/badges/BadgeCollection';
import Link from 'next/link';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Achievement Badges - Rowan',
  description: 'Track your achievement badges and progress',
};

export default async function BadgesPage() {
  const supabase = await createClient();

  // Get authenticated user (server-side JWT validation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get active space
  const spaceId = await getUserFirstSpaceId(user.id, supabase);

  if (!spaceId) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/goals"
              className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Back to Goals
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-5xl">🏆</div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Achievement Badges
              </h1>
              <p className="text-gray-400 mt-1">
                Earn badges by completing goals and reaching milestones
              </p>
            </div>
          </div>
        </div>

        {/* Badge Collection */}
        <BadgeCollection userId={user.id} spaceId={spaceId} />
      </div>
    </div>
  );
}
