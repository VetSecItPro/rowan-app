'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';

interface NewBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
  currentBudget?: number;
  spaceId: string;
}

export function NewBudgetModal({
  isOpen,
  onClose,
  onSave,
  currentBudget,
  spaceId,
}: NewBudgetModalProps) {
  const [amount, setAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setAmount(currentBudget ? currentBudget.toString() : '');
    }
  }, [isOpen, currentBudget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetAmount = parseFloat(amount);
    if (budgetAmount && budgetAmount > 0) {
      onSave(budgetAmount);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-projects rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentBudget ? 'Update Budget' : 'Set Monthly Budget'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Budget Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-lg"
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Set your total monthly budget for household expenses
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 shimmer-projects text-white rounded-lg hover:opacity-90 transition-all shadow-lg font-medium"
            >
              {currentBudget ? 'Update Budget' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
