'use client';

import { DollarSign, MoreVertical, CheckCircle } from 'lucide-react';
import { Expense } from '@/lib/services/budgets-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, memo } from 'react';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  onStatusChange: (expenseId: string, newStatus: 'pending' | 'paid') => void;
}

function ExpenseCardComponent({ expense, onEdit, onDelete, onStatusChange }: ExpenseCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMarkAsPaid = () => {
    if (expense.status === 'pending') {
      onStatusChange(expense.id, 'paid');
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${expense.status === 'paid' ? 'bg-green-500' : 'bg-orange-500'}`}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{expense.title}</h3>
            <p className="text-2xl font-bold text-white">${expense.amount.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              {expense.category && <span className="truncate">{expense.category}</span>}
              {expense.due_date && <span className="whitespace-nowrap">Due {formatTimestamp(expense.due_date, 'MMM d')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {expense.status === 'pending' && (
            <button
              onClick={handleMarkAsPaid}
              className="btn-touch p-1.5 hover:bg-green-900/20 rounded-full transition-colors active:scale-95"
              title="Mark as paid"
              aria-label="Mark expense as paid"
            >
              <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-400" />
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} aria-label="Expense options menu" className="p-2 text-gray-400 hover:text-gray-300 transition-colors"><MoreVertical className="w-5 h-5" /></button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden">
                  <button onClick={() => { onEdit(expense); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors">Edit</button>
                  <button onClick={() => { onDelete(expense.id); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-900/20 transition-colors">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <span className={`inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full ${expense.status === 'paid'
          ? 'bg-green-900/30 text-green-400'
          : 'bg-orange-900/30 text-orange-400'
        }`}>
        {expense.status}
      </span>
    </div>
  );
}

export const ExpenseCard = memo(ExpenseCardComponent);
