'use client';

import { useState, useEffect } from 'react';
import { X, Users, Calculator, DollarSign, Percent, TrendingUp, AlertCircle, Check } from 'lucide-react';
import { SplitTypeSelector } from './SplitTypeSelector';
import { SplitCalculator } from './SplitCalculator';
import { SettlementTracker } from './SettlementTracker';
import {
  updateExpenseSplit,
  calculateIncomeBasedSplit,
  getPartnershipBalance,
  type SplitType,
  type OwnershipType,
  type PartnershipBalance,
} from '@/lib/services/expense-splitting-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface ExpenseSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    title: string;
    amount: number;
    category?: string;
    ownership?: OwnershipType;
    split_type?: SplitType;
    split_percentage_user1?: number;
    split_percentage_user2?: number;
    split_amount_user1?: number;
    split_amount_user2?: number;
    is_split?: boolean;
  };
  onSave: () => void;
}

export function ExpenseSplitModal({
  isOpen,
  onClose,
  expense,
  onSave,
}: ExpenseSplitModalProps) {
  const { user, currentSpace } = useAuth();
  const [ownership, setOwnership] = useState<OwnershipType>(expense.ownership || 'shared');
  const [splitType, setSplitType] = useState<SplitType>(expense.split_type || 'equal');
  const [splitPercentageUser1, setSplitPercentageUser1] = useState(expense.split_percentage_user1 || 50);
  const [splitPercentageUser2, setSplitPercentageUser2] = useState(expense.split_percentage_user2 || 50);
  const [splitAmountUser1, setSplitAmountUser1] = useState(expense.split_amount_user1 || expense.amount / 2);
  const [splitAmountUser2, setSplitAmountUser2] = useState(expense.split_amount_user2 || expense.amount / 2);
  const [isSplit, setIsSplit] = useState(expense.is_split ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnership, setPartnership] = useState<PartnershipBalance | null>(null);

  // Load partnership data for income-based calculations
  useEffect(() => {
    async function loadPartnership() {
      if (!currentSpace) return;

      try {
        const data = await getPartnershipBalance(currentSpace.id);
        setPartnership(data);
      } catch (err) {
        console.error('Failed to load partnership data:', err);
      }
    }

    if (isOpen) {
      loadPartnership();
    }
  }, [isOpen, currentSpace]);

  // Calculate split amounts based on type
  useEffect(() => {
    if (!isSplit) return;

    switch (splitType) {
      case 'equal':
        setSplitAmountUser1(expense.amount / 2);
        setSplitAmountUser2(expense.amount / 2);
        setSplitPercentageUser1(50);
        setSplitPercentageUser2(50);
        break;

      case 'percentage':
        setSplitAmountUser1((expense.amount * splitPercentageUser1) / 100);
        setSplitAmountUser2((expense.amount * splitPercentageUser2) / 100);
        break;

      case 'fixed':
        // Keep current amounts, but ensure they add up to total
        if (splitAmountUser1 + splitAmountUser2 !== expense.amount) {
          setSplitAmountUser2(expense.amount - splitAmountUser1);
        }
        setSplitPercentageUser1((splitAmountUser1 / expense.amount) * 100);
        setSplitPercentageUser2((splitAmountUser2 / expense.amount) * 100);
        break;

      case 'income-based':
        if (partnership?.user1_income && partnership?.user2_income) {
          const calculation = calculateIncomeBasedSplit(
            expense.amount,
            partnership.user1_income,
            partnership.user2_income
          );
          setSplitAmountUser1(calculation.user1Amount);
          setSplitAmountUser2(calculation.user2Amount);
          setSplitPercentageUser1(calculation.user1Percentage);
          setSplitPercentageUser2(calculation.user2Percentage);
        } else {
          // Fallback to equal split if no income data
          setSplitAmountUser1(expense.amount / 2);
          setSplitAmountUser2(expense.amount / 2);
          setSplitPercentageUser1(50);
          setSplitPercentageUser2(50);
        }
        break;
    }
  }, [splitType, splitPercentageUser1, splitPercentageUser2, splitAmountUser1, expense.amount, isSplit, partnership]);

  // Handle percentage changes
  const handlePercentageChange = (user: 1 | 2, percentage: number) => {
    if (user === 1) {
      setSplitPercentageUser1(percentage);
      setSplitPercentageUser2(100 - percentage);
    } else {
      setSplitPercentageUser2(percentage);
      setSplitPercentageUser1(100 - percentage);
    }
  };

  // Handle fixed amount changes
  const handleAmountChange = (user: 1 | 2, amount: number) => {
    if (user === 1) {
      setSplitAmountUser1(amount);
      setSplitAmountUser2(expense.amount - amount);
    } else {
      setSplitAmountUser2(amount);
      setSplitAmountUser1(expense.amount - amount);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await updateExpenseSplit(expense.id, {
        ownership,
        split_type: splitType,
        split_percentage_user1: splitPercentageUser1,
        split_percentage_user2: splitPercentageUser2,
        split_amount_user1: splitAmountUser1,
        split_amount_user2: splitAmountUser2,
        is_split: isSplit,
      });

      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to update expense split:', err);
      setError('Failed to update expense split. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Split Expense
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {expense.title} • ${expense.amount.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Ownership Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Who is this expense for?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { value: 'shared', label: 'Shared Expense', icon: Users, desc: 'Split between partners' },
                  { value: 'yours', label: 'Your Expense', icon: DollarSign, desc: 'Your personal expense' },
                  { value: 'theirs', label: 'Partner Expense', icon: DollarSign, desc: 'Partner\'s personal expense' },
                ] as const).map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setOwnership(option.value);
                        if (option.value !== 'shared') {
                          setIsSplit(false);
                        } else {
                          setIsSplit(true);
                        }
                      }}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        ownership === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`w-5 h-5 ${
                          ownership === option.value
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                        <span className={`font-medium ${
                          ownership === option.value
                            ? 'text-purple-900 dark:text-purple-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        ownership === option.value
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {option.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Configuration (only for shared expenses) */}
            {ownership === 'shared' && (
              <>
                {/* Enable/Disable Split */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Enable Splitting</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track who owes what for this expense
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSplit}
                      onChange={(e) => setIsSplit(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Split Type & Calculator */}
                {isSplit && (
                  <>
                    <SplitTypeSelector
                      selectedType={splitType}
                      onTypeChange={setSplitType}
                      expense={expense}
                      partnership={partnership}
                    />

                    <SplitCalculator
                      splitType={splitType}
                      totalAmount={expense.amount}
                      user1Amount={splitAmountUser1}
                      user2Amount={splitAmountUser2}
                      user1Percentage={splitPercentageUser1}
                      user2Percentage={splitPercentageUser2}
                      onPercentageChange={handlePercentageChange}
                      onAmountChange={handleAmountChange}
                      partnership={partnership}
                    />
                  </>
                )}
              </>
            )}

            {/* Settlement Tracker (if already split) */}
            {expense.is_split && (
              <SettlementTracker
                expenseId={expense.id}
                spaceId={currentSpace?.id || ''}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Split Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}