'use client';

import { Wallet, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BalanceSummary } from '@/lib/services/expense-splitting-service';

interface PartnerBalanceWidgetProps {
  balances: BalanceSummary[];
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  onSettleUp?: () => void;
  className?: string;
}

export function PartnerBalanceWidget({
  balances,
  currentUserId,
  currentUserName,
  partnerName,
  onSettleUp,
  className = '',
}: PartnerBalanceWidgetProps) {
  // Find current user's balance
  const currentUserBalance = balances.find((b) => b.user_id === currentUserId);
  const netBalance = currentUserBalance?.net_balance ?? 0;

  // Determine who owes whom
  const youOwe = netBalance < 0;
  const theyOwe = netBalance > 0;
  const balanced = Math.abs(netBalance) < 0.01;
  const amount = Math.abs(netBalance);

  // Get color classes based on balance
  const getBalanceColors = () => {
    if (balanced) {
      return {
        bg: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        icon: 'text-gray-500',
      };
    }
    if (youOwe) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-500',
      };
    }
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500',
    };
  };

  const colors = getBalanceColors();

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Wallet className={`w-5 h-5 ${colors.icon}`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Balance</h3>
      </div>

      {/* Balance Display */}
      <div className="mb-4">
        {balanced ? (
          <div className="text-center py-6">
            <Minus className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">All Settled Up!</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You and {partnerName} are even
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            {youOwe ? (
              <>
                <TrendingDown className={`w-12 h-12 mx-auto mb-3 ${colors.icon}`} />
                <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                  ${amount.toLocaleString()}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You owe {partnerName}
                </p>
              </>
            ) : (
              <>
                <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${colors.icon}`} />
                <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                  ${amount.toLocaleString()}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {partnerName} owes you
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Balance Breakdown */}
      {!balanced && currentUserBalance && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">You owe:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              ${currentUserBalance.amount_owed.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Owed to you:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${currentUserBalance.amount_owed_to_them.toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white">Net Balance:</span>
            <span className={`font-bold ${colors.text}`}>
              {netBalance < 0 ? '-' : '+'}${amount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Settle Up Button */}
      {!balanced && onSettleUp && (
        <button
          onClick={onSettleUp}
          className={`
            w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all
            ${
              youOwe
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }
            hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              youOwe ? 'focus:ring-red-500' : 'focus:ring-green-500'
            }
          `}
        >
          {youOwe ? 'Pay' : 'Request Payment'}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Info Note */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
        Balance calculated from unsettled expense splits
      </p>
    </div>
  );
}
