'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import {
  calculateCurrentBalance,
  getMonthlySettlementTrends,
  getSplitExpenseStats,
  type BalanceSummary,
} from '@/lib/services/expense-splitting-service';

interface PartnerBalanceWidgetProps {
  spaceId: string;
  className?: string;
  showTrends?: boolean;
}

export function PartnerBalanceWidget({
  spaceId,
  className = '',
  showTrends = true,
}: PartnerBalanceWidgetProps) {
  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [trends, setTrends] = useState<{ month: string; total: number; count: number }[]>([]);
  const [stats, setStats] = useState({
    totalSplit: 0,
    splitCount: 0,
    unsettledCount: 0,
    unsettledAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [balanceData, trendsData, statsData] = await Promise.all([
          calculateCurrentBalance(spaceId),
          showTrends ? getMonthlySettlementTrends(spaceId, 6) : Promise.resolve([]),
          getSplitExpenseStats(spaceId),
        ]);

        setBalances(balanceData);
        setTrends(trendsData);
        setStats(statsData);
      } catch (err) {
        logger.error('Failed to load balance data:', err, { component: 'PartnerBalanceWidget', action: 'component_action' });
        setError('Failed to load balance information');
      } finally {
        setLoading(false);
      }
    }

    if (spaceId) {
      loadData();
    }
  }, [spaceId, showTrends]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="ml-2 text-gray-400">Loading balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const netBalance = balances.reduce((sum, b) => sum + b.net_balance, 0);
  const hasBalance = Math.abs(netBalance) > 0.01;
  const isBalanced = !hasBalance;

  // Determine who owes whom
  const positiveBalance = balances.find(b => b.net_balance > 0);
  const negativeBalance = balances.find(b => b.net_balance < 0);

  return (
    <div className={`bg-gray-800 rounded-xl shadow-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Partner Balance
            </h3>
            <p className="text-sm text-gray-400">
              Current split expense balances
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Balance Status */}
        {isBalanced ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-green-100 mb-1">
              All Settled Up!
            </h4>
            <p className="text-sm text-green-300">
              No outstanding balances between partners
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Net Balance Display */}
            <div className="text-center p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-100">
                  Net Balance
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                ${Math.abs(netBalance).toFixed(2)}
              </p>
              {positiveBalance && negativeBalance && (
                <p className="text-sm text-purple-300 mt-1">
                  {negativeBalance.user_email?.split('@')[0] || 'Partner'} owes{' '}
                  {positiveBalance.user_email?.split('@')[0] || 'Partner'}
                </p>
              )}
            </div>

            {/* Individual Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {balances.map((balance) => (
                <div
                  key={balance.user_id}
                  className={`p-4 rounded-lg border-2 ${
                    balance.net_balance > 0
                      ? 'border-green-800 bg-green-900/20'
                      : balance.net_balance < 0
                      ? 'border-red-800 bg-red-900/20'
                      : 'border-gray-700 bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {balance.net_balance > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : balance.net_balance < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-white">
                      {balance.user_email?.split('@')[0] || 'Partner'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Amount owed:</span>
                      <span className="font-medium text-white">
                        ${balance.amount_owed.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Owed to them:</span>
                      <span className="font-medium text-white">
                        ${balance.amount_owed_to_them.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-600">
                      <span className="font-medium text-gray-300">Net balance:</span>
                      <span className={`font-bold ${
                        balance.net_balance > 0
                          ? 'text-green-400'
                          : balance.net_balance < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {balance.net_balance > 0 ? '+' : ''}${balance.net_balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {stats.splitCount}
            </p>
            <p className="text-xs text-gray-400">Split Expenses</p>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-white">
              ${stats.totalSplit.toFixed(0)}
            </p>
            <p className="text-xs text-gray-400">Total Split</p>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-red-400">
              {stats.unsettledCount}
            </p>
            <p className="text-xs text-gray-400">Unsettled</p>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-red-400">
              ${stats.unsettledAmount.toFixed(0)}
            </p>
            <p className="text-xs text-gray-400">Unsettled $</p>
          </div>
        </div>

        {/* Settlement Trends */}
        {showTrends && trends.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h4 className="font-medium text-white">
                Settlement Trends (Last 6 Months)
              </h4>
            </div>
            <div className="space-y-2">
              {trends.slice(-3).map((trend) => (
                <div
                  key={trend.month}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded"
                >
                  <span className="text-sm text-gray-400">
                    {format(new Date(trend.month + '-01'), 'MMM yyyy')}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      ${trend.total.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      ({trend.count} payments)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {hasBalance && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">💡 Settlement Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Use split expense modals to track payments</li>
                  <li>• Record settlement payments to keep balances current</li>
                  <li>• Set up regular settlement schedules (weekly/monthly)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
