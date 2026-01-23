'use client';

// Phase 14: Rewards Catalog Component
// Displays available rewards and handles redemption

import { useEffect, useState } from 'react';
import { rewardsService, pointsService } from '@/lib/services/rewards';
import type { RewardCatalogItem } from '@/lib/types/rewards';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

interface RewardsCatalogProps {
  spaceId: string;
  userId: string;
  className?: string;
  onRedemption?: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; tooltip: string }> = {
  screen_time: { label: 'Screen Time', icon: '📱', tooltip: 'Extra screen time, gaming hours, or device access' },
  treats: { label: 'Treats', icon: '🍦', tooltip: 'Snacks, desserts, and special food treats' },
  activities: { label: 'Activities', icon: '🎮', tooltip: 'Fun activities like outings, games, or special experiences' },
  money: { label: 'Money', icon: '💵', tooltip: 'Allowance bonuses or spending money' },
  privileges: { label: 'Privileges', icon: '✨', tooltip: 'Special permissions like staying up late or picking dinner' },
  other: { label: 'Other', icon: '🎁', tooltip: 'Miscellaneous rewards and surprises' },
};

export function RewardsCatalog({
  spaceId,
  userId,
  className = '',
  onRedemption,
}: RewardsCatalogProps) {
  const [rewards, setRewards] = useState<RewardCatalogItem[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<RewardCatalogItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [rewardsData, points] = await Promise.all([
          rewardsService.getRewards(spaceId),
          pointsService.getPointsBalance(userId, spaceId),
        ]);
        setRewards(rewardsData);
        setUserPoints(points);
        setError(null);
      } catch (err) {
        logger.error('Failed to load rewards:', err, { component: 'RewardsCatalog', action: 'component_action' });
        setError('Failed to load rewards');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [spaceId, userId]);

  const handleRedeem = async (reward: RewardCatalogItem) => {
    if (userPoints < reward.cost_points) return;
    setShowConfirm(reward);
  };

  const confirmRedeem = async () => {
    if (!showConfirm) return;

    try {
      setRedeeming(showConfirm.id);
      await rewardsService.redeemReward(userId, spaceId, showConfirm.id);

      // Update points locally
      setUserPoints((prev) => prev - showConfirm.cost_points);

      // Notify parent
      onRedemption?.();

      setShowConfirm(null);
    } catch (err) {
      logger.error('Failed to redeem reward:', err, { component: 'RewardsCatalog', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to redeem reward');
    } finally {
      setRedeeming(null);
    }
  };

  const filteredRewards = selectedCategory
    ? rewards.filter((r) => r.category === selectedCategory)
    : rewards;

  const categories = [...new Set(rewards.map((r) => r.category))];

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && rewards.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 ${className}`}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 ${className}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Tooltip content="Spend your hard-earned points on rewards! Click any reward to redeem." position="right">
              <h3 className="font-semibold text-white flex items-center gap-2 cursor-help">
                🎁 Rewards Shop
              </h3>
            </Tooltip>
            <Tooltip content="Your spendable points balance. Earn more by completing tasks and chores!" position="left">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 rounded-full cursor-help">
                <span className="font-semibold text-amber-300">
                  {userPoints.toLocaleString()}
                </span>
                <span className="text-amber-400 text-sm">pts</span>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="px-4 py-2 border-b border-gray-700 overflow-x-auto">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? 'bg-amber-900/30 text-amber-300'
                    : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                return (
                  <Tooltip key={cat} content={config.tooltip} position="bottom">
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                        selectedCategory === cat
                          ? 'bg-amber-900/30 text-amber-300'
                          : 'text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <span>{config.icon}</span>
                      {config.label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* Rewards Grid */}
        <div className="p-4">
          {filteredRewards.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-3xl mb-2 block">🎁</span>
              <p>No rewards available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredRewards.map((reward) => {
                const canAfford = userPoints >= reward.cost_points;
                const isRedeeming = redeeming === reward.id;

                return (
                  <div
                    key={reward.id}
                    className={`relative rounded-lg border p-3 transition-all ${
                      canAfford
                        ? 'border-gray-700 hover:border-amber-600 hover:shadow-md cursor-pointer'
                        : 'border-gray-700 opacity-60'
                    }`}
                    onClick={() => canAfford && handleRedeem(reward)}
                  >
                    {/* Emoji */}
                    <div className="text-3xl mb-2">{reward.emoji}</div>

                    {/* Name */}
                    <h4 className="font-medium text-white text-sm line-clamp-2 mb-1">
                      {reward.name}
                    </h4>

                    {/* Description */}
                    {reward.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {reward.description}
                      </p>
                    )}

                    {/* Cost */}
                    <div className="flex items-center justify-between mt-auto">
                      <span
                        className={`font-bold text-sm ${
                          canAfford
                            ? 'text-amber-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {reward.cost_points} pts
                      </span>
                      {!canAfford && (
                        <span className="text-xs text-gray-500">
                          Need {reward.cost_points - userPoints} more
                        </span>
                      )}
                    </div>

                    {/* Weekly Limit Badge */}
                    {reward.max_redemptions_per_week && (
                      <div className="absolute top-2 right-2">
                        <Tooltip content={`Can only redeem ${reward.max_redemptions_per_week} time${reward.max_redemptions_per_week > 1 ? 's' : ''} per week`} position="left">
                          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded cursor-help">
                            {reward.max_redemptions_per_week}/wk
                          </span>
                        </Tooltip>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isRedeeming && (
                      <div className="absolute inset-0 bg-gray-800/80 rounded-lg flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Error Toast */}
        {error && rewards.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-red-900/20 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center">
              <span className="text-5xl mb-4 block">{showConfirm.emoji}</span>
              <h3 className="text-lg font-semibold text-white mb-2">
                Redeem {showConfirm.name}?
              </h3>
              <p className="text-gray-400 mb-4">
                This will cost <span className="font-bold text-amber-400">{showConfirm.cost_points} points</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You&apos;ll have {userPoints - showConfirm.cost_points} points remaining
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRedeem}
                  disabled={redeeming !== null}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {redeeming ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Redeeming...
                    </>
                  ) : (
                    'Redeem'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
