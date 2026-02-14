'use client';

// Phase 14: Pending Redemptions Component
// Parent UI to approve, deny, or fulfill reward redemption requests

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import {
  Clock,
  Check,
  X,
  Gift,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { rewardsService } from '@/lib/services/rewards';
import { sanitizePlainText } from '@/lib/sanitize';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RewardRedemption, RedemptionStatus } from '@/lib/types/rewards';

interface PendingRedemptionsProps {
  spaceId: string;
  currentUserId: string;
  className?: string;
}

/** Renders a list of pending reward redemption requests awaiting approval. */
export function PendingRedemptions({
  spaceId,
  currentUserId,
  className = '',
}: PendingRedemptionsProps) {
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [denyReasonModal, setDenyReasonModal] = useState<{
    redemptionId: string;
    rewardName: string;
  } | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const loadRedemptions = useCallback(async () => {
    try {
      setLoading(true);
      // Get pending redemptions first, then approved (ready to fulfill)
      const pending = await rewardsService.getRedemptions(spaceId, {
        status: 'pending',
      });
      const approved = await rewardsService.getRedemptions(spaceId, {
        status: 'approved',
      });
      setRedemptions([...pending, ...approved]);
      setError(null);
    } catch (err) {
      logger.error('Failed to load redemptions:', err, { component: 'PendingRedemptions', action: 'component_action' });
      setError('Failed to load redemption requests');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  const handleApprove = async (redemptionId: string) => {
    setProcessingId(redemptionId);
    try {
      await rewardsService.approveRedemption(redemptionId, currentUserId);
      await loadRedemptions(); // Refresh list
    } catch (err) {
      logger.error('Failed to approve:', err, { component: 'PendingRedemptions', action: 'component_action' });
      setError('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFulfill = async (redemptionId: string) => {
    setProcessingId(redemptionId);
    try {
      await rewardsService.fulfillRedemption(redemptionId);
      await loadRedemptions(); // Refresh - will remove fulfilled item
    } catch (err) {
      logger.error('Failed to fulfill:', err, { component: 'PendingRedemptions', action: 'component_action' });
      setError('Failed to mark as fulfilled');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async () => {
    if (!denyReasonModal) return;

    setProcessingId(denyReasonModal.redemptionId);
    try {
      const sanitizedReason = denyReason.trim()
        ? sanitizePlainText(denyReason.trim())
        : undefined;
      await rewardsService.denyRedemption(
        denyReasonModal.redemptionId,
        currentUserId,
        sanitizedReason
      );
      await loadRedemptions();
      setDenyReasonModal(null);
      setDenyReason('');
    } catch (err) {
      logger.error('Failed to deny:', err, { component: 'PendingRedemptions', action: 'component_action' });
      setError('Failed to deny request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: RedemptionStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300">
            <Clock className="w-3 h-3" />
            Awaiting Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300">
            <Check className="w-3 h-3" />
            Approved - Ready to Give
          </span>
        );
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Pending items to show
  const displayItems = showAll ? redemptions : redemptions.slice(0, 5);
  const hasMore = redemptions.length > 5;

  if (loading) {
    return (
      <div
        className={`bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 ${className}`}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-700 rounded w-1/2" />
          <div className="h-16 bg-gray-700 rounded" />
          <div className="h-16 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <Tooltip
          content="Reward requests from family members waiting for your approval"
          position="right"
        >
          <h3 className="font-semibold text-white flex items-center gap-2 cursor-help">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Requests
            {redemptions.length > 0 && (
              <span className="bg-yellow-900/30 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {redemptions.length}
              </span>
            )}
          </h3>
        </Tooltip>
        <button
          onClick={loadRedemptions}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-800">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="divide-y divide-gray-700">
        {redemptions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Gift className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              No pending reward requests
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Requests will appear here when family members redeem rewards
            </p>
          </div>
        ) : (
          <>
            {displayItems.map((redemption) => {
              const isProcessing = processingId === redemption.id;
              const user = redemption.user;
              const reward = redemption.reward;

              return (
                <div
                  key={redemption.id}
                  className="px-4 py-3 flex items-start gap-3"
                >
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {user?.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user?.name || 'Family Member'}
                        </p>
                        <p className="text-sm text-gray-400">
                          wants{' '}
                          <span className="font-medium">
                            {reward?.emoji} {reward?.name || 'Reward'}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatTimeAgo(redemption.created_at)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-1">{getStatusBadge(redemption.status)}</div>

                    {/* Points Cost */}
                    <p className="text-xs text-gray-400 mt-1">
                      {redemption.points_spent} points spent
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      {redemption.status === 'pending' && (
                        <>
                          <Tooltip content="Approve this request" position="top">
                            <button
                              onClick={() => handleApprove(redemption.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                          </Tooltip>
                          <Tooltip
                            content="Deny and refund points"
                            position="top"
                          >
                            <button
                              onClick={() =>
                                setDenyReasonModal({
                                  redemptionId: redemption.id,
                                  rewardName: reward?.name || 'Reward',
                                })
                              }
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              Deny
                            </button>
                          </Tooltip>
                        </>
                      )}
                      {redemption.status === 'approved' && (
                        <Tooltip
                          content="Mark as complete once you've given the reward"
                          position="top"
                        >
                          <button
                            onClick={() => handleFulfill(redemption.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Gift className="w-3 h-3" />
                            )}
                            Mark as Given
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show More / Less */}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full px-4 py-2 text-sm text-gray-400 hover:bg-gray-700/50 flex items-center justify-center gap-1 transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {redemptions.length - 5} More
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Deny Reason Modal */}
      {denyReasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-white mb-2">
              Deny Request
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to deny the request for{' '}
              <strong>{denyReasonModal.rewardName}</strong>? Points will be
              refunded.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g., Not enough chores done this week"
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-900 text-white placeholder-gray-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setDenyReasonModal(null);
                  setDenyReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={processingId === denyReasonModal.redemptionId}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processingId === denyReasonModal.redemptionId ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Deny Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
