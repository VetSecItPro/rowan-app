'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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
  const [amount, setAmount] = useState<string>(() => (currentBudget ? currentBudget.toString() : ''));

  const handleClose = () => {
    setAmount(currentBudget ? currentBudget.toString() : '');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetAmount = parseFloat(amount);
    if (budgetAmount && budgetAmount > 0) {
      onSave(budgetAmount);
      handleClose();
    }
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleClose}
        className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-budget-form"
        className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full hover:opacity-90 transition-all shadow-lg font-medium"
      >
        {currentBudget ? 'Update Budget' : 'Set Budget'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={currentBudget ? 'Update Budget' : 'Set Monthly Budget'}
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-orange-500 to-amber-600"
      footer={footerContent}
    >
      <form id="new-budget-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
            Monthly Budget Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              id="budget-amount"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000.00"
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white text-lg"
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Set your total monthly budget for household expenses
          </p>
        </div>
      </form>
    </Modal>
  );
}
