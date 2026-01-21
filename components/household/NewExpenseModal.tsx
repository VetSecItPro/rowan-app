'use client';

import { useState, useEffect } from 'react';
import { CreateExpenseInput } from '@/lib/services/budgets-service';
import { Expense } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: CreateExpenseInput) => void;
  editExpense?: Expense | null;
  spaceId: string;
}

export function NewExpenseModal({ isOpen, onClose, onSave, editExpense, spaceId }: NewExpenseModalProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    space_id: spaceId,
    title: '',
    amount: 0,
    category: '',
    status: 'pending',
    due_date: '',
    recurring: false,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editExpense) {
      setFormData({ space_id: spaceId, title: editExpense.title, amount: editExpense.amount, category: editExpense.category || '', status: editExpense.status, due_date: editExpense.due_date || '', recurring: editExpense.recurring || false });
    } else {
      setFormData({ space_id: spaceId, title: '', amount: 0, category: '', status: 'pending', due_date: '', recurring: false });
    }
  }, [editExpense, spaceId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-expense-form"
        className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full hover:from-amber-600 hover:to-amber-700 transition-colors font-medium"
      >
        {editExpense ? 'Save' : 'Create'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editExpense ? 'Edit Expense' : 'New Expense'}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-amber-500 to-amber-600"
      footer={footerContent}
    >
      <form id="new-expense-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount *</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
          />
        </div>
      </form>
    </Modal>
  );
}
