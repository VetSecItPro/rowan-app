'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateExpenseInput, Expense } from '@/lib/services/budgets-service';

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
  const [dateError, setDateError] = useState<string>('');

  useEffect(() => {
    if (editExpense) {
      setFormData({ space_id: spaceId, title: editExpense.title, amount: editExpense.amount, category: editExpense.category || '', status: editExpense.status, due_date: editExpense.due_date || '', recurring: editExpense.recurring || false });
    } else {
      setFormData({ space_id: spaceId, title: '', amount: 0, category: '', status: 'pending', due_date: '', recurring: false });
    }
    setDateError('');
  }, [editExpense, spaceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">{editExpense ? 'Edit Expense' : 'New Expense'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();

          // Validate due date is not in the past
          if (formData.due_date) {
            const dueDate = new Date(formData.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dueDate < today) {
              setDateError('Due date is in the past');
              return;
            }
          }

          setDateError('');

          // Clean up form data - remove empty optional fields
          const cleanedData: CreateExpenseInput = {
            space_id: formData.space_id,
            title: formData.title,
            amount: formData.amount,
          };

          if (formData.category && formData.category.trim() !== '') {
            cleanedData.category = formData.category;
          }
          if (formData.due_date && formData.due_date.trim() !== '') {
            cleanedData.due_date = formData.due_date;
            cleanedData.date = formData.due_date; // Also set date for backwards compatibility
          }
          if (formData.status) {
            cleanedData.status = formData.status;
          }
          if (formData.recurring !== undefined) {
            cleanedData.recurring = formData.recurring;
          }

          onSave(cleanedData);
          onClose();
        }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => {
                setFormData({ ...formData, due_date: e.target.value });

                // Validate on change
                if (e.target.value) {
                  const dueDate = new Date(e.target.value);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  if (dueDate < today) {
                    setDateError('Due date is in the past');
                  } else {
                    setDateError('');
                  }
                } else {
                  setDateError('');
                }
              }}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg ${
                dateError ? 'border-red-500 dark:border-red-500' : ''
              }`}
            />
            {dateError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="font-medium">⚠</span>
                {dateError}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
            <button
              type="submit"
              disabled={!!dateError}
              className={`flex-1 px-6 py-2 shimmer-bg text-white rounded-lg ${
                dateError ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {editExpense ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
