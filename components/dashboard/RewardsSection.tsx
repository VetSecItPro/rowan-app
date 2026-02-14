'use client';

import React from 'react';
import nextDynamic from 'next/dynamic';

const PointsDisplay = nextDynamic(
  () => import('@/components/rewards').then(mod => ({ default: mod.PointsDisplay })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);

const LeaderboardWidget = nextDynamic(
  () => import('@/components/rewards').then(mod => ({ default: mod.LeaderboardWidget })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);

interface RewardsSectionProps {
  userId: string;
  spaceId: string;
}

/** Displays the rewards points summary and recent earnings on the dashboard. */
export function RewardsSection({ userId, spaceId }: RewardsSectionProps) {
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PointsDisplay
        userId={userId}
        spaceId={spaceId}
        variant="full"
        showStreak={true}
      />
      <LeaderboardWidget
        spaceId={spaceId}
        currentUserId={userId}
        period="week"
        maxEntries={5}
      />
    </div>
  );
}
