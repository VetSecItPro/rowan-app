'use client';

import { Calculator, DollarSign, Percent, Users, TrendingUp } from 'lucide-react';
import {
  calculateIncomeBasedSplit,
  type SplitType,
  type PartnershipBalance,
} from '@/lib/services/expense-splitting-service';

interface SplitCalculatorProps {
  splitType: SplitType;
  totalAmount: number;
  user1Amount: number;
  user2Amount: number;
  user1Percentage: number;
  user2Percentage: number;
  onPercentageChange: (user: 1 | 2, percentage: number) => void;
  onAmountChange: (user: 1 | 2, amount: number) => void;
  partnership: PartnershipBalance | null;
}

export function SplitCalculator({
  splitType,
  totalAmount,
  user1Amount,
  user2Amount,
  user1Percentage,
  user2Percentage,
  onPercentageChange,
  onAmountChange,
  partnership,
}: SplitCalculatorProps) {
  const isValid = Math.abs((user1Amount + user2Amount) - totalAmount) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">
          Split Calculation
        </h3>
      </div>

      {/* Calculation Display */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Partner 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-medium text-white">
                Partner 1
              </h4>
            </div>

            {/* Amount Display */}
            <div className="bg-gray-800 rounded-lg p-4 border-2 border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Amount</span>
              </div>
              {splitType === 'fixed' ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  value={user1Amount.toFixed(2)}
                  onChange={(e) => onAmountChange(1, parseFloat(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-blue-400 bg-transparent border-none outline-none"
                />
              ) : (
                <p className="text-2xl font-bold text-blue-400">
                  ${user1Amount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Percentage Display */}
            <div className="bg-gray-800 rounded-lg p-4 border-2 border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Percentage</span>
              </div>
              {splitType === 'percentage' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={user1Percentage.toFixed(1)}
                    onChange={(e) => onPercentageChange(1, parseFloat(e.target.value) || 0)}
                    className="flex-1 text-xl font-bold text-blue-400 bg-transparent border-none outline-none"
                  />
                  <span className="text-blue-400 font-bold">%</span>
                </div>
              ) : (
                <p className="text-xl font-bold text-blue-400">
                  {user1Percentage.toFixed(1)}%
                </p>
              )}
            </div>

            {/* Income Info (for income-based) */}
            {splitType === 'income-based' && partnership?.user1_income && (
              <div className="bg-green-900/20 rounded-lg p-3 border border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Monthly Income</span>
                </div>
                <p className="text-lg font-semibold text-green-400">
                  ${partnership.user1_income.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Partner 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-medium text-white">
                Partner 2
              </h4>
            </div>

            {/* Amount Display */}
            <div className="bg-gray-800 rounded-lg p-4 border-2 border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Amount</span>
              </div>
              {splitType === 'fixed' ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  value={user2Amount.toFixed(2)}
                  onChange={(e) => onAmountChange(2, parseFloat(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-purple-400 bg-transparent border-none outline-none"
                />
              ) : (
                <p className="text-2xl font-bold text-purple-400">
                  ${user2Amount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Percentage Display */}
            <div className="bg-gray-800 rounded-lg p-4 border-2 border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Percentage</span>
              </div>
              {splitType === 'percentage' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={user2Percentage.toFixed(1)}
                    onChange={(e) => onPercentageChange(2, parseFloat(e.target.value) || 0)}
                    className="flex-1 text-xl font-bold text-purple-400 bg-transparent border-none outline-none"
                  />
                  <span className="text-purple-400 font-bold">%</span>
                </div>
              ) : (
                <p className="text-xl font-bold text-purple-400">
                  {user2Percentage.toFixed(1)}%
                </p>
              )}
            </div>

            {/* Income Info (for income-based) */}
            {splitType === 'income-based' && partnership?.user2_income && (
              <div className="bg-green-900/20 rounded-lg p-3 border border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Monthly Income</span>
                </div>
                <p className="text-lg font-semibold text-green-400">
                  ${partnership.user2_income.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Total Validation */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">
              Total Split:
            </span>
            <span className={`text-lg font-bold ${
              isValid
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              ${(user1Amount + user2Amount).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-medium text-gray-300">
              Original Amount:
            </span>
            <span className="text-lg font-bold text-white">
              ${totalAmount.toFixed(2)}
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-400 mt-2">
              ⚠️ Split amounts don't equal the total expense
            </p>
          )}
        </div>
      </div>

      {/* Income-Based Fairness Indicator */}
      {splitType === 'income-based' && partnership?.user1_income && partnership?.user2_income && (
        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800 rounded-lg p-4">
          <h4 className="font-medium text-green-100 mb-2">
            💡 Fair Split Calculation
          </h4>
          <div className="text-sm text-green-200 space-y-1">
            <p>
              Income ratio: {((partnership.user1_income / (partnership.user1_income + partnership.user2_income)) * 100).toFixed(1)}% / {((partnership.user2_income / (partnership.user1_income + partnership.user2_income)) * 100).toFixed(1)}%
            </p>
            <p>This split reflects each partner's earning capacity for fair expense sharing.</p>
          </div>
        </div>
      )}
    </div>
  );
}