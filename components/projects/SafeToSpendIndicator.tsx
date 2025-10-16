'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';

interface SafeToSpendIndicatorProps {
  spaceId: string;
}

export function SafeToSpendIndicator({ spaceId }: SafeToSpendIndicatorProps) {
  const [loading, setLoading] = useState(true);
  const [safeToSpendInfo, setSafeToSpendInfo] = useState<{
    safeToSpend: number;
    status: 'safe' | 'warning' | 'danger' | 'over';
    percentageUsed: number;
    daysLeftInMonth: number;
    dailyBudget: number;
  } | null>(null);

  useEffect(() => {
    async function loadSafeToSpend() {
      if (!spaceId) return;

      try {
        setLoading(true);
        const info = await budgetAlertsService.getSafeToSpendInfo(spaceId);
        setSafeToSpendInfo(info);
      } catch (error) {
        console.error('Failed to load safe to spend info:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSafeToSpend();
  }, [spaceId]);

  if (loading || !safeToSpendInfo) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  const { safeToSpend, status, percentageUsed, daysLeftInMonth, dailyBudget } = safeToSpendInfo;

  // Determine colors and icons based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'safe':
        return {
          gradient: 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20',
          border: 'border-green-200 dark:border-green-700',
          textColor: 'text-green-700 dark:text-green-300',
          icon: CheckCircle,
          iconColor: 'text-green-600 dark:text-green-400',
          label: 'Safe to Spend',
          message: 'You\'re on track with your budget!',
        };
      case 'warning':
        return {
          gradient: 'from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20',
          border: 'border-yellow-200 dark:border-yellow-700',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          icon: AlertCircle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          label: 'Approaching Limit',
          message: 'You\'ve used 75% of your budget.',
        };
      case 'danger':
        return {
          gradient: 'from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-800/20',
          border: 'border-orange-200 dark:border-orange-700',
          textColor: 'text-orange-700 dark:text-orange-300',
          icon: TrendingDown,
          iconColor: 'text-orange-600 dark:text-orange-400',
          label: 'Budget Alert',
          message: 'You\'ve used 90% of your budget!',
        };
      case 'over':
        return {
          gradient: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
          border: 'border-red-300 dark:border-red-700',
          textColor: 'text-red-700 dark:text-red-300',
          icon: TrendingDown,
          iconColor: 'text-red-600 dark:text-red-400',
          label: 'Over Budget',
          message: 'You\'ve exceeded your monthly budget.',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`bg-gradient-to-br ${config.gradient} border ${config.border} rounded-xl p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${config.textColor}`}>{config.label}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{config.message}</p>
          </div>
        </div>
      </div>

      {/* Safe to Spend Amount */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <DollarSign className={`w-6 h-6 ${config.iconColor}`} />
          <h3 className={`text-4xl font-bold ${config.textColor}`}>
            ${Math.floor(safeToSpend).toLocaleString()}
          </h3>
          {safeToSpend !== Math.floor(safeToSpend) && (
            <span className={`text-2xl ${config.textColor}`}>
              .{Math.round((safeToSpend % 1) * 100).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {status === 'over' ? 'Amount over budget' : 'Remaining this month'}
        </p>
      </div>

      {/* Daily Budget Guidance */}
      {status !== 'over' && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-300 dark:border-gray-600">
          <Calendar className={`w-4 h-4 ${config.iconColor}`} />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">${dailyBudget.toFixed(2)}/day</span>
            {' '}for the next {daysLeftInMonth} {daysLeftInMonth === 1 ? 'day' : 'days'}
          </p>
        </div>
      )}

      {/* Budget Usage Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Budget Used</span>
          <span className="font-medium">{Math.min(100, percentageUsed).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'over' || status === 'danger'
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : status === 'warning'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}
            style={{ width: `${Math.min(100, percentageUsed)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
