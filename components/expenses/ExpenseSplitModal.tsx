'use client';

import { useState, useCallback } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { SplitTypeSelector } from './SplitTypeSelector';
import { SplitCalculator, type SplitResult } from './SplitCalculator';
import type { SplitType } from '@/lib/validations/expense-splitting';
import { safeValidateUpdateSplitExpense } from '@/lib/validations/expense-splitting';

interface ExpenseSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string;
  expenseName: string;
  totalAmount: number;
  currentSplitType?: SplitType;
  currentSplitData?: {
    user1Percentage?: number;
    user2Percentage?: number;
    user1Amount?: number;
    user2Amount?: number;
  };
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  user1Income?: number;
  user2Income?: number;
  onSave: (data: {
    split_type: SplitType;
    split_percentage_user1?: number;
    split_percentage_user2?: number;
    split_amount_user1?: number;
    split_amount_user2?: number;
    is_split: boolean;
  }) => Promise<void>;
}

export function ExpenseSplitModal({
  isOpen,
  onClose,
  expenseId,
  expenseName,
  totalAmount,
  currentSplitType = 'equal',
  currentSplitData,
  user1Id,
  user1Name,
  user2Id,
  user2Name,
  user1Income,
  user2Income,
  onSave,
}: ExpenseSplitModalProps) {
  const [splitType, setSplitType] = useState<SplitType>(currentSplitType);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCalculate = useCallback((result: SplitResult) => {
    setSplitResult(result);
  }, []);

  const handleSave = async () => {
    if (!splitResult) {
      setError('Please calculate split before saving');
      return;
    }

    // Build split data based on type
    const splitData: any = {
      split_type: splitType,
      is_split: true,
    };

    if (splitType === 'percentage' || splitType === 'income-based') {
      splitData.split_percentage_user1 = splitResult.user1Percentage;
      splitData.split_percentage_user2 = splitResult.user2Percentage;
    } else if (splitType === 'fixed') {
      splitData.split_amount_user1 = splitResult.user1Amount;
      splitData.split_amount_user2 = splitResult.user2Amount;
    }

    // Validate with Zod
    const validation = safeValidateUpdateSplitExpense(splitData);

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Invalid split data');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(validation.data);
      setSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to save split:', err);
      setError('Failed to save split. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Split Expense
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {expenseName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-4 flex items-center gap-3">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Split Saved Successfully!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Expense splits have been calculated and saved.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {!success && (
              <>
                {/* Step 1: Split Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Step 1: Choose Split Method
                  </h3>
                  <SplitTypeSelector
                    selectedType={splitType}
                    onSelect={setSplitType}
                    disabled={saving}
                  />
                </div>

                {/* Step 2: Split Calculation */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Step 2: Review Split
                  </h3>
                  <SplitCalculator
                    totalAmount={totalAmount}
                    splitType={splitType}
                    user1Name={user1Name}
                    user2Name={user2Name}
                    user1Income={user1Income}
                    user2Income={user2Income}
                    onCalculate={handleCalculate}
                  />
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Saving this split will automatically calculate who owes what
                      and update your partner balance. The split will appear on both partners' dashboards.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !splitResult}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Split
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
