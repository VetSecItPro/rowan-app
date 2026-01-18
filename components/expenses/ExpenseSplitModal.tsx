'use client';

import { useState, useCallback } from 'react';
import { Save, AlertCircle, Check } from 'lucide-react';
import { SplitTypeSelector } from './SplitTypeSelector';
import { SplitCalculator, type SplitResult } from './SplitCalculator';
import type { SplitType } from '@/lib/validations/expense-splitting';
import { safeValidateUpdateSplitExpense } from '@/lib/validations/expense-splitting';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

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
      // Type assertion: we know split_type and is_split are set because we set them explicitly above
      await onSave({
        ...validation.data,
        split_type: splitType,
        is_split: true,
      });
      setSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      logger.error('Failed to save split:', err, { component: 'ExpenseSplitModal', action: 'component_action' });
      setError('Failed to save split. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const footerContent = !success ? (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        disabled={saving}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !splitResult}
        className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Expense"
      subtitle={expenseName}
      maxWidth="4xl"
      headerGradient="bg-emerald-600"
      footer={footerContent}
    >
      <div className="space-y-6">
        {/* Success Message */}
            {success && (
              <div className="bg-green-900/20 border-2 border-green-600 rounded-lg p-4 flex items-center gap-3">
                <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-100">
                    Split Saved Successfully!
                  </h3>
                  <p className="text-sm text-green-300">
                    Expense splits have been calculated and saved.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-100 mb-1">
                    Error
                  </h3>
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            )}

            {!success && (
              <>
                {/* Step 1: Split Type Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
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
                  <h3 className="text-lg font-semibold text-white mb-3">
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
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <strong>Note:</strong> Saving this split will automatically calculate who owes what
                      and update your partner balance. The split will appear on both partners' dashboards.
                    </div>
                  </div>
                </div>
              </>
            )}
      </div>
    </Modal>
  );
}
