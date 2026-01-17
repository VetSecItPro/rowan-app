'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';
import { logger } from '@/lib/logger';

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
        logger.error('Failed to load safe to spend info:', error, { component: 'SafeToSpendIndicator', action: 'component_action' });
      } finally {
        setLoading(false);
      }
    }

    loadSafeToSpend();
  }, [spaceId]);

  if (loading || !safeToSpendInfo) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-700 rounded-xl" />
      </div>
    );
  }

  const { safeToSpend, status, percentageUsed, daysLeftInMonth, dailyBudget } = safeToSpendInfo;

  // Determine colors and icons based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'safe':
        return {
          gradient: 'from-green-900/20 to-emerald-800/20',
          border: 'border-green-700',
          textColor: 'text-green-300',
          icon: CheckCircle,
          iconColor: 'text-green-400',
          label: 'Safe to Spend',
          message: 'You\'re on track with your budget!',
        };
      case 'warning':
        return {
          gradient: 'from-yellow-900/20 to-orange-800/20',
          border: 'border-yellow-700',
          textColor: 'text-yellow-300',
          icon: AlertCircle,
          iconColor: 'text-yellow-400',
          label: 'Approaching Limit',
          message: 'You\'ve used 75% of your budget.',
        };
      case 'danger':
        return {
          gradient: 'from-orange-900/20 to-red-800/20',
          border: 'border-orange-700',
          textColor: 'text-orange-300',
          icon: TrendingDown,
          iconColor: 'text-orange-400',
          label: 'Budget Alert',
          message: 'You\'ve used 90% of your budget!',
        };
      case 'over':
        return {
          gradient: 'from-red-900/30 to-red-800/30',
          border: 'border-red-700',
          textColor: 'text-red-300',
          icon: TrendingDown,
          iconColor: 'text-red-400',
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
          <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${config.textColor}`}>{config.label}</p>
            <p className="text-xs text-gray-400">{config.message}</p>
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
        <p className="text-sm text-gray-400">
          {status === 'over' ? 'Amount over budget' : 'Remaining this month'}
        </p>
      </div>

      {/* Daily Budget Guidance */}
      {status !== 'over' && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-600">
          <Calendar className={`w-4 h-4 ${config.iconColor}`} />
          <p className="text-sm text-gray-300">
            <span className="font-semibold">${dailyBudget.toFixed(2)}/day</span>
            {' '}for the next {daysLeftInMonth} {daysLeftInMonth === 1 ? 'day' : 'days'}
          </p>
        </div>
      )}

    </div>
  );
}
