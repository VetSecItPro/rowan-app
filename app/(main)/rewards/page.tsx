'use client';

// Phase 14: Rewards Shop Page
// Users can view their points, browse rewards, and redeem them

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { Gift, Trophy, Star, TrendingUp, Settings } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { PointsDisplay, RewardsCatalog, LeaderboardWidget, RewardsManagement, PendingRedemptions } from '@/components/rewards';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import Link from 'next/link';

export default function RewardsPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [showManagement, setShowManagement] = useState(false);

  // Check if user is a parent (owner or admin)
  const isParent = currentSpace?.role === 'owner' || currentSpace?.role === 'admin';

  const handleRedemption = useCallback(() => {
    setRedemptionCount(prev => prev + 1);
  }, []);

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Rewards Shop' }]}>
      <PageErrorBoundary>
        <div className="min-h-full p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    Rewards Shop
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Earn points by completing chores and redeem them for rewards
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Parent Management Toggle */}
                {isParent && (
                  <button
                    onClick={() => setShowManagement(!showManagement)}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                      showManagement
                        ? 'bg-amber-900/30 text-amber-300 border border-amber-700'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>{showManagement ? 'View Shop' : 'Manage'}</span>
                  </button>
                )}

                {/* Quick link to tasks */}
                <Link
                  href="/tasks"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Earn More Points</span>
                </Link>
              </div>
            </div>

            {/* Conditional View: Shop or Management */}
            {showManagement && isParent ? (
              /* Parent Management View */
              <div className="space-y-6">
                {/* Pending Redemptions - Show requests needing approval */}
                <PendingRedemptions
                  spaceId={spaceId}
                  currentUserId={user.id}
                />

                {/* Rewards Catalog Management */}
                <RewardsManagement spaceId={spaceId} userId={user.id} />
              </div>
            ) : (
              /* Regular Shop View */
              <>
                {/* Points Display - Full Version */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <PointsDisplay
                      userId={user.id}
                      spaceId={spaceId}
                      variant="full"
                      showStreak={true}
                      key={redemptionCount} // Force refresh after redemption
                    />
                  </div>

                  {/* How It Works Card */}
                  <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-amber-500" />
                      How to Earn Points
                    </h3>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">+10</span>
                        <span className="text-gray-400">Complete a chore</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">+5</span>
                        <span className="text-gray-400">Complete a task</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">+5/day</span>
                        <span className="text-gray-400">Daily streak bonus (max +25)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">+50</span>
                        <span className="text-gray-400">Weekly chore goal</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">+100</span>
                        <span className="text-gray-400">Perfect week (all chores done)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Rewards Catalog - Main Section */}
                  <div className="lg:col-span-2">
                    <RewardsCatalog
                      spaceId={spaceId}
                      userId={user.id}
                      onRedemption={handleRedemption}
                    />
                  </div>

                  {/* Leaderboard Sidebar */}
                  <div className="space-y-6">
                    <LeaderboardWidget
                      spaceId={spaceId}
                      currentUserId={user.id}
                      period="week"
                      maxEntries={5}
                    />

                    {/* Achievement Teaser */}
                    <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
                      <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                        <Trophy className="w-5 h-5 text-purple-500" />
                        Achievements
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        Complete milestones to unlock special badges and bonus points!
                      </p>
                      <Link
                        href="/achievements"
                        className="text-sm text-purple-400 hover:underline flex items-center gap-1"
                      >
                        View all achievements
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PageErrorBoundary>
    </FeatureLayout>
  );
}
