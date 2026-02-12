'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertCircle, User, Users } from 'lucide-react';
import type { SplitType } from '@/lib/validations/expense-splitting';
import { calculateIncomeBasedSplit } from '@/lib/services/expense-splitting-service';

interface SplitCalculatorProps {
  totalAmount: number;
  splitType: SplitType;
  user1Name: string;
  user2Name: string;
  user1Income?: number;
  user2Income?: number;
  onCalculate: (result: SplitResult) => void;
  className?: string;
}

export interface SplitResult {
  user1Amount: number;
  user2Amount: number;
  user1Percentage: number;
  user2Percentage: number;
}

export function SplitCalculator({
  totalAmount,
  splitType,
  user1Name,
  user2Name,
  user1Income = 0,
  user2Income = 0,
  onCalculate,
  className = '',
}: SplitCalculatorProps) {
  // State for custom inputs
  const [user1Percentage, setUser1Percentage] = useState(50);
  const [user2Percentage, setUser2Percentage] = useState(50);
  const [user1FixedAmount, setUser1FixedAmount] = useState(totalAmount / 2);
  const [user2FixedAmount, setUser2FixedAmount] = useState(totalAmount / 2);

  // Calculate split based on type
  const result = useMemo<SplitResult>(() => {
    switch (splitType) {
      case 'equal':
        const halfAmount = Math.round((totalAmount / 2) * 100) / 100;
        return {
          user1Amount: halfAmount,
          user2Amount: halfAmount,
          user1Percentage: 50,
          user2Percentage: 50,
        };

      case 'percentage':
        const user1Amt = Math.round((totalAmount * (user1Percentage / 100)) * 100) / 100;
        const user2Amt = Math.round((totalAmount * (user2Percentage / 100)) * 100) / 100;
        return {
          user1Amount: user1Amt,
          user2Amount: user2Amt,
          user1Percentage: user1Percentage,
          user2Percentage: user2Percentage,
        };

      case 'fixed':
        const fixedTotal = user1FixedAmount + user2FixedAmount;
        const user1Pct = fixedTotal > 0 ? (user1FixedAmount / fixedTotal) * 100 : 50;
        const user2Pct = fixedTotal > 0 ? (user2FixedAmount / fixedTotal) * 100 : 50;
        return {
          user1Amount: Math.round(user1FixedAmount * 100) / 100,
          user2Amount: Math.round(user2FixedAmount * 100) / 100,
          user1Percentage: Math.round(user1Pct * 100) / 100,
          user2Percentage: Math.round(user2Pct * 100) / 100,
        };

      case 'income-based':
        if (user1Income > 0 && user2Income > 0) {
          return calculateIncomeBasedSplit(totalAmount, user1Income, user2Income);
        }
        // Fallback to equal if no income data
        const equalAmount = Math.round((totalAmount / 2) * 100) / 100;
        return {
          user1Amount: equalAmount,
          user2Amount: equalAmount,
          user1Percentage: 50,
          user2Percentage: 50,
        };

      default:
        return {
          user1Amount: 0,
          user2Amount: 0,
          user1Percentage: 0,
          user2Percentage: 0,
        };
    }
  }, [totalAmount, splitType, user1Percentage, user2Percentage, user1FixedAmount, user2FixedAmount, user1Income, user2Income]);

  // Notify parent of calculation result
  useEffect(() => {
    onCalculate(result);
  }, [result, onCalculate]);

  // Validation checks
  const percentageError = Math.abs(user1Percentage + user2Percentage - 100) > 0.01;
  const fixedAmountError = Math.abs(user1FixedAmount + user2FixedAmount - totalAmount) > 0.01;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-white">Split Calculation</h3>
      </div>

      {/* Total Amount Display */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Total Amount</span>
          <span className="text-2xl font-bold text-amber-600">
            ${totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Custom Input Fields for Percentage Split */}
      {splitType === 'percentage' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {user1Name} %
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="0.01"
                value={user1Percentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setUser1Percentage(val);
                  setUser2Percentage(100 - val);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {user2Name} %
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="0.01"
                value={user2Percentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setUser2Percentage(val);
                  setUser1Percentage(100 - val);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          {percentageError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Percentages must sum to 100%</span>
            </div>
          )}
        </div>
      )}

      {/* Custom Input Fields for Fixed Split */}
      {splitType === 'fixed' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {user1Name} $
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="0.01"
                value={user1FixedAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setUser1FixedAmount(val);
                  setUser2FixedAmount(totalAmount - val);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {user2Name} $
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="0.01"
                value={user2FixedAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setUser2FixedAmount(val);
                  setUser1FixedAmount(totalAmount - val);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          {fixedAmountError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Amounts must sum to ${totalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Income Information for Income-Based */}
      {splitType === 'income-based' && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <strong>Income-based split:</strong> Proportional to each person&apos;s income
            </div>
          </div>
          {user1Income > 0 && user2Income > 0 ? (
            <div className="text-xs text-blue-300 mt-2 space-y-1">
              <div>{user1Name}: ${user1Income.toLocaleString()}/month</div>
              <div>{user2Name}: ${user2Income.toLocaleString()}/month</div>
            </div>
          ) : (
            <div className="text-xs text-red-400 mt-2">
              Income information not set. Update incomes to use this split type.
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      <div className="grid grid-cols-2 gap-3">
        {/* User 1 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-300">{user1Name}</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mb-1">
            ${result.user1Amount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            {result.user1Percentage.toFixed(1)}% of total
          </div>
        </div>

        {/* User 2 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-300">{user2Name}</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            ${result.user2Amount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            {result.user2Percentage.toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* Visual Split Bar */}
      <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-emerald-500 transition-all flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${result.user1Percentage}%` }}
        >
          {result.user1Percentage > 15 && `${result.user1Percentage.toFixed(0)}%`}
        </div>
        <div
          className="absolute right-0 top-0 h-full bg-blue-500 transition-all flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${result.user2Percentage}%` }}
        >
          {result.user2Percentage > 15 && `${result.user2Percentage.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
