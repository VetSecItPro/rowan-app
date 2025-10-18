'use client';

import { Equal, Percent, DollarSign, TrendingUp, Info } from 'lucide-react';
import {
  suggestSplitType,
  type SplitType,
  type PartnershipBalance,
} from '@/lib/services/expense-splitting-service';

interface SplitTypeSelectorProps {
  selectedType: SplitType;
  onTypeChange: (type: SplitType) => void;
  expense: {
    amount: number;
    category?: string;
  };
  partnership: PartnershipBalance | null;
}

export function SplitTypeSelector({
  selectedType,
  onTypeChange,
  expense,
  partnership,
}: SplitTypeSelectorProps) {
  const suggestedType = suggestSplitType(expense.category || '', expense.amount);

  const splitTypes = [
    {
      value: 'equal' as SplitType,
      label: 'Equal Split',
      icon: Equal,
      description: 'Split equally between both partners',
      example: `$${(expense.amount / 2).toFixed(2)} each`,
      recommended: suggestedType === 'equal',
    },
    {
      value: 'percentage' as SplitType,
      label: 'Percentage Split',
      icon: Percent,
      description: 'Split by custom percentages',
      example: 'You: 60%, Partner: 40%',
      recommended: false,
    },
    {
      value: 'fixed' as SplitType,
      label: 'Fixed Amounts',
      icon: DollarSign,
      description: 'Set specific amounts for each person',
      example: 'Custom dollar amounts',
      recommended: false,
    },
    {
      value: 'income-based' as SplitType,
      label: 'Income-Based Split',
      icon: TrendingUp,
      description: 'Split proportionally based on incomes',
      example: partnership?.user1_income && partnership?.user2_income
        ? 'Fair split based on earnings'
        : 'Setup incomes first',
      recommended: suggestedType === 'income-based',
      disabled: !partnership?.user1_income || !partnership?.user2_income,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          How should this be split?
        </h3>
        {suggestedType && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
            <Info className="w-3 h-3" />
            {suggestedType === 'equal' ? 'Equal' : 'Income-based'} recommended
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {splitTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;
          const isDisabled = type.disabled;

          return (
            <button
              key={type.value}
              onClick={() => !isDisabled && onTypeChange(type.value)}
              disabled={isDisabled}
              className={`btn-touch relative p-4 rounded-lg border-2 text-left transition-all ${
                isDisabled
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md active:scale-[0.98] hover-lift shimmer-purple active-press'
              }`}
            >
              {/* Recommended Badge */}
              {type.recommended && !isDisabled && (
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                  Recommended
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isDisabled
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : isSelected
                    ? 'bg-purple-500'
                    : 'bg-gray-100 dark:bg-gray-600'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isDisabled
                      ? 'text-gray-400'
                      : isSelected
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`} />
                </div>

                <div className="flex-1">
                  <h4 className={`font-medium mb-1 ${
                    isDisabled
                      ? 'text-gray-400'
                      : isSelected
                      ? 'text-purple-900 dark:text-purple-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {type.label}
                  </h4>

                  <p className={`text-sm mb-2 ${
                    isDisabled
                      ? 'text-gray-400'
                      : isSelected
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {type.description}
                  </p>

                  <p className={`text-xs font-medium ${
                    isDisabled
                      ? 'text-gray-400'
                      : isSelected
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {type.example}
                  </p>
                </div>
              </div>

              {/* Income Setup Warning */}
              {type.value === 'income-based' && isDisabled && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                  <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                    <Info className="w-3 h-3" />
                    Setup partner incomes to enable this option
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Income-Based Info Panel */}
      {selectedType === 'income-based' && partnership?.user1_income && partnership?.user2_income && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Income-Based Calculation
            </h4>
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>Partner 1: ${partnership.user1_income.toLocaleString()}/month</p>
            <p>Partner 2: ${partnership.user2_income.toLocaleString()}/month</p>
            <p className="pt-1 font-medium">
              This ensures fair splitting based on earning capacity
            </p>
          </div>
        </div>
      )}
    </div>
  );
}