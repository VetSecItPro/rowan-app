'use client';

/**
 * Penalty History Component
 * Displays late penalties with option to forgive (admin only)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  HandHeart,
  Check,
  ChevronDown,
  User,
  Loader2,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { LatePenalty } from '@/lib/services/rewards/late-penalty-service';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface SpaceMember {
  user_id: string;
  display_name?: string;
  email?: string;
  role: string;
}

interface PenaltyHistoryProps {
  className?: string;
  userId?: string; // Optional: filter by user
  limit?: number;
}

/** Displays a history of late penalties applied to household members. */
export function PenaltyHistory({ className, userId, limit = 20 }: PenaltyHistoryProps) {
  const { currentSpace } = useSpaces();
  const { user: _currentUser } = useAuth();
  const [penalties, setPenalties] = useState<LatePenalty[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [forgivingId, setForgivingId] = useState<string | null>(null);
  const [showForgiven, setShowForgiven] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get user role from current space
  const userRole = currentSpace?.role || 'member';
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Get user name from members
  const getUserName = (memberId: string) => {
    const member = members.find((m: SpaceMember) => m.user_id === memberId);
    return member?.display_name || member?.email?.split('@')[0] || 'Unknown';
  };

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!currentSpace?.id) return;

    const supabase = createClient();
    const { data } = await supabase
      .from('space_members')
      .select(`
        user_id,
        role,
        users!user_id (
          id,
          email,
          display_name
        )
      `)
      .eq('space_id', currentSpace.id);

    if (data) {
      setMembers(data.map((d: { user_id: string; role: string; users: { email?: string; display_name?: string } | null }) => ({
        user_id: d.user_id,
        role: d.role,
        email: d.users?.email,
        display_name: d.users?.display_name,
      })));
    }
  }, [currentSpace?.id]);

  // Fetch penalties
  const fetchPenalties = useCallback(async () => {
    if (!currentSpace?.id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        spaceId: currentSpace.id,
        includeForgiven: showForgiven.toString(),
      });
      if (userId) {
        params.set('userId', userId);
      }

      const response = await fetch(`/api/penalties?${params}`);
      const data = await response.json();

      if (response.ok && data.penalties) {
        setPenalties(data.penalties.slice(0, limit));
      }
    } catch (error) {
      console.error('Failed to fetch penalties:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace?.id, userId, showForgiven, limit]);

  useEffect(() => {
    fetchPenalties();
    fetchMembers();
  }, [fetchPenalties, fetchMembers]);

  // Forgive a penalty
  const handleForgive = async (penaltyId: string, reason?: string) => {
    if (!isAdmin) return;

    try {
      setForgivingId(penaltyId);
      const response = await fetch('/api/penalties/forgive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penaltyId, reason }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: `Penalty forgiven! ${data.pointsRefunded} points refunded.`
        });
        setTimeout(() => setFeedback(null), 3000);
        fetchPenalties();
      } else {
        throw new Error(data.error || 'Failed to forgive penalty');
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to forgive penalty'
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setForgivingId(null);
    }
  };

  if (loading) {
    return (
      <div className={cn('rounded-2xl bg-gray-800 p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl bg-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Penalty History</h3>
              <p className="text-sm text-gray-400">
                {penalties.length} {penalties.length === 1 ? 'penalty' : 'penalties'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Show Forgiven Toggle */}
            <button
              onClick={() => setShowForgiven(!showForgiven)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                showForgiven
                  ? 'bg-amber-900/30 text-amber-400'
                  : 'bg-gray-700 text-gray-400'
              )}
            >
              {showForgiven ? 'All' : 'Active'}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchPenalties}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'flex items-center gap-2 px-6 py-3 border-b',
              feedback.type === 'success'
                ? 'bg-green-900/20 text-green-400 border-green-800/50'
                : 'bg-red-900/20 text-red-400 border-red-800/50'
            )}>
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Penalty List */}
      <div className="divide-y divide-gray-700">
        <AnimatePresence mode="popLayout">
          {penalties.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-12 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-900/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-medium text-white mb-1">No penalties</p>
              <p className="text-sm text-gray-400">
                Everyone is completing chores on time!
              </p>
            </motion.div>
          ) : (
            penalties.map((penalty, index) => (
              <motion.div
                key={penalty.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'px-6 py-4',
                  penalty.is_forgiven && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* User & Points */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                      <span className="font-medium text-white">
                        {getUserName(penalty.user_id)}
                      </span>
                      <span className="text-red-400 font-semibold">
                        -{penalty.points_deducted} pts
                      </span>
                      {penalty.is_forgiven && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          Forgiven
                        </span>
                      )}
                    </div>

                    {/* Days late */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        {penalty.days_late} {penalty.days_late === 1 ? 'day' : 'days'} late
                      </span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(penalty.created_at))} ago</span>
                    </div>

                    {/* Expandable details */}
                    <AnimatePresence>
                      {expandedId === penalty.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-gray-700 overflow-hidden"
                        >
                          <div className="text-sm space-y-1 text-gray-400">
                            <p>
                              <span className="text-gray-400">Due:</span>{' '}
                              {format(new Date(penalty.due_date), 'MMM d, yyyy h:mm a')}
                            </p>
                            {penalty.completion_date && (
                              <p>
                                <span className="text-gray-400">Completed:</span>{' '}
                                {format(new Date(penalty.completion_date), 'MMM d, yyyy h:mm a')}
                              </p>
                            )}
                            {penalty.is_forgiven && penalty.forgiven_reason && (
                              <p>
                                <span className="text-gray-400">Reason:</span>{' '}
                                {penalty.forgiven_reason}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Expand/Collapse */}
                    <button
                      onClick={() => setExpandedId(expandedId === penalty.id ? null : penalty.id)}
                      className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <motion.div
                        animate={{ rotate: expandedId === penalty.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Forgive button (admin only, not forgiven) */}
                    {isAdmin && !penalty.is_forgiven && (
                      <button
                        onClick={() => handleForgive(penalty.id)}
                        disabled={forgivingId === penalty.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors text-sm font-medium"
                      >
                        {forgivingId === penalty.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <HandHeart className="w-4 h-4" />
                        )}
                        Forgive
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Info Footer */}
      {isAdmin && penalties.some((p) => !p.is_forgiven) && (
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-start gap-2 text-sm text-gray-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              As an admin, you can forgive penalties to refund deducted points.
              Consider forgiving penalties for legitimate reasons like illness or emergencies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PenaltyHistory;
