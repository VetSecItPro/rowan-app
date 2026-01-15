'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateExpenseInput } from '@/lib/services/budgets-service';
import { Expense } from '@/lib/types';

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

  useEffect(() => {
    if (editExpense) {
      setFormData({ space_id: spaceId, title: editExpense.title, amount: editExpense.amount, category: editExpense.category || '', status: editExpense.status, due_date: editExpense.due_date || '', recurring: editExpense.recurring || false });
    } else {
      setFormData({ space_id: spaceId, title: '', amount: 0, category: '', status: 'pending', due_date: '', recurring: false });
    }
  }, [editExpense, spaceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:rounded-xl shadow-2xl sm:max-w-lg overflow-hidden flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-amber-500 to-amber-600 sm:rounded-t-xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{editExpense ? 'Edit Expense' : 'New Expense'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5 text-white" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Due Date</label>
            <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2 bg-gray-700 rounded-full">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-2 shimmer-bg text-white rounded-full">{editExpense ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
