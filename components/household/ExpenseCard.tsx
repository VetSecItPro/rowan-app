'use client';

import { DollarSign, MoreVertical } from 'lucide-react';
import { Expense } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${expense.status === 'paid' ? 'bg-green-500' : 'bg-orange-500'}`}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{expense.title}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${expense.amount.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
              {expense.category && <span>{expense.category}</span>}
              {expense.due_date && <span>Due {format(new Date(expense.due_date), 'MMM d')}</span>}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical className="w-4 h-4" /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-20">
                <button onClick={() => { onEdit(expense); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg">Edit</button>
                <button onClick={() => { onDelete(expense.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
      <span className={`inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full ${expense.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{expense.status}</span>
    </div>
  );
}
