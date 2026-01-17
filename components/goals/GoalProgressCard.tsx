'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import type { FinancialGoal } from '@/lib/services/goal-contributions-service';
import { getGoalContributions, calculateProjectedCompletionDate } from '@/lib/services/goal-contributions-service';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/lib/logger';

interface GoalProgressCardProps {
  goal: FinancialGoal;
  onClick?: () => void;
}

export default function GoalProgressCard({ goal, onClick }: GoalProgressCardProps) {
  const [projectedDate, setProjectedDate] = useState<string | null>(null);
  const [recentContributions, setRecentContributions] = useState<any[]>([]);

  useEffect(() => {
    loadGoalData();
  }, [goal.id]);

  const loadGoalData = async () => {
    try {
      // Get projected completion date
      const projected = await calculateProjectedCompletionDate(goal.id);
      setProjectedDate(projected);

      // Get recent contributions
      const contributions = await getGoalContributions(goal.id);
      setRecentContributions(contributions.slice(0, 3));
    } catch (error) {
      logger.error('Error loading goal data:', error, { component: 'GoalProgressCard', action: 'component_action' });
    }
  };

  if (!goal.is_financial || !goal.target_amount) {
    return null; // Only show for financial goals
  }

  const currentAmount = goal.current_amount ?? 0;
  const progress = Math.min(100, (currentAmount / goal.target_amount) * 100);
  const remaining = Math.max(0, goal.target_amount - currentAmount);
  const isComplete = currentAmount >= goal.target_amount;

  // Milestone markers at 25%, 50%, 75%, 100%
  const milestones = [
    { percent: 25, reached: progress >= 25 },
    { percent: 50, reached: progress >= 50 },
    { percent: 75, reached: progress >= 75 },
    { percent: 100, reached: progress >= 100 },
  ];

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br from-gray-800 to-gray-900 border-2 ${
        isComplete
          ? 'border-green-700'
          : 'border-gray-700'
      } rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-sm text-gray-400 line-clamp-1">
                  {goal.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {isComplete && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Complete!
          </div>
        )}
      </div>

      {/* Progress Amount */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-3xl font-bold text-white">
              ${(goal.current_amount ?? 0).toLocaleString()}
            </span>
            <span className="text-gray-400 ml-2">
              of ${goal.target_amount.toLocaleString()}
            </span>
          </div>
          <span className="text-2xl font-bold text-indigo-400">
            {progress.toFixed(0)}%
          </span>
        </div>

        {!isComplete && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>${remaining.toLocaleString()} remaining</span>
          </div>
        )}
      </div>

      {/* Progress Bar with Milestones */}
      <div className="mb-6">
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
          {/* Animated progress fill */}
          <div
            className={`h-full transition-all duration-1000 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
            }`}
            style={{ width: `${progress}%` }}
          >
            <div className="h-full bg-white/20 animate-pulse" />
          </div>

          {/* Milestone markers */}
          {milestones.map((milestone) => (
            <div
              key={milestone.percent}
              className="absolute top-0 bottom-0 w-0.5 bg-gray-900"
              style={{ left: `${milestone.percent}%` }}
            >
              <div
                className={`absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  milestone.reached
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'bg-gray-700 border-gray-600'
                }`}
              >
                {milestone.reached && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </div>
          ))}
        </div>

        {/* Milestone labels */}
        <div className="flex justify-between mt-8 text-xs text-gray-400">
          <span className={milestones[0].reached ? 'text-indigo-400 font-medium' : ''}>
            25%
          </span>
          <span className={milestones[1].reached ? 'text-indigo-400 font-medium' : ''}>
            50%
          </span>
          <span className={milestones[2].reached ? 'text-indigo-400 font-medium' : ''}>
            75%
          </span>
          <span className={milestones[3].reached ? 'text-green-400 font-medium' : ''}>
            Goal
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Target Date */}
        {goal.target_date && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Calendar className="w-3 h-3" />
              <span>Target Date</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {new Date(goal.target_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Projected Completion */}
        {!isComplete && projectedDate && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>Projected</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {new Date(projectedDate).toLocaleDateString()}
            </p>
            {goal.target_date && new Date(projectedDate) > new Date(goal.target_date) && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Behind target
              </p>
            )}
          </div>
        )}

        {/* Completion Status */}
        {isComplete && (
          <div className="bg-green-900/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
              <CheckCircle className="w-3 h-3" />
              <span>Goal Reached!</span>
            </div>
            <p className="text-sm font-semibold text-green-400">
              100% Complete
            </p>
          </div>
        )}
      </div>

      {/* Recent Contributions */}
      {recentContributions.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <Users className="w-4 h-4" />
            <span>Recent Contributions</span>
          </div>
          <div className="space-y-2">
            {recentContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-indigo-400">
                      {contribution.user_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      ${contribution.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(contribution.contribution_date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
