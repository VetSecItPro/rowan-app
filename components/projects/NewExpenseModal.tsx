'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Smile } from 'lucide-react';
import { CreateExpenseInput, Expense } from '@/lib/services/budgets-service';

// Expense-appropriate emojis
const EMOJIS = ['💰', '💵', '💳', '💸', '🏦', '🛒', '🍽️', '☕', '⚡', '🏠', '🚗', '⛽', '💊', '🏥', '🎬', '🎮', '📚', '✈️', '🏨', '👕'];

// Expense categories with amber theme colors
const EXPENSE_CATEGORIES = {
  groceries: { emoji: '🛒', label: 'Groceries', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  utilities: { emoji: '⚡', label: 'Utilities', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  transportation: { emoji: '🚗', label: 'Transportation', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  healthcare: { emoji: '🏥', label: 'Healthcare', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  entertainment: { emoji: '🎬', label: 'Entertainment', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  dining: { emoji: '🍽️', label: 'Dining', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  shopping: { emoji: '🛍️', label: 'Shopping', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  housing: { emoji: '🏠', label: 'Housing', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  insurance: { emoji: '🛡️', label: 'Insurance', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  education: { emoji: '📚', label: 'Education', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  other: { emoji: '📌', label: 'Other', color: 'bg-gray-500', textColor: 'text-gray-600', lightBg: 'bg-gray-100 dark:bg-gray-900/30' },
};

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
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiButtonRect, setEmojiButtonRect] = useState<DOMRect | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editExpense) {
      setFormData({ space_id: spaceId, title: editExpense.title, amount: editExpense.amount, category: editExpense.category || '', status: editExpense.status, due_date: editExpense.due_date || '', recurring: editExpense.recurring || false });
    } else {
      setFormData({ space_id: spaceId, title: '', amount: 0, category: '', status: 'pending', due_date: '', recurring: false });
    }
    setShowEmojiPicker(false);
    setDateError('');
  }, [editExpense, spaceId]);

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header with amber gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">{editExpense ? 'Edit Expense' : 'Create New Expense'}</h2>
            <button onClick={onClose} aria-label="Close modal" className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95">
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
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

          // Use custom category if "other" is selected, otherwise use dropdown value
          if (formData.category === 'other' && customCategory.trim() !== '') {
            cleanedData.category = customCategory;
          } else if (formData.category && formData.category.trim() !== '' && formData.category !== 'other') {
            cleanedData.category = formData.category;
          }

          // Always set date - use due_date if provided, otherwise use today's date
          if (formData.due_date && formData.due_date.trim() !== '') {
            cleanedData.due_date = formData.due_date;
            cleanedData.date = formData.due_date;
          } else {
            // If no due_date, use today's date as the expense date
            cleanedData.date = new Date().toISOString().split('T')[0];
          }
          if (formData.status) {
            cleanedData.status = formData.status;
          }
          if (formData.recurring !== undefined) {
            cleanedData.recurring = formData.recurring;
          }

          onSave(cleanedData);
          onClose();
        }} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium mb-2 cursor-pointer">Title *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 pr-12 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => {
                    if (emojiButtonRef.current) {
                      setEmojiButtonRect(emojiButtonRef.current.getBoundingClientRect());
                    }
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  title="Add emoji"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium mb-2 cursor-pointer">Amount *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="field-3" className="block text-sm font-medium mb-2 cursor-pointer">Category</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    if (e.target.value !== 'other') {
                      setCustomCategory('');
                    }
                  }}
                  className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border rounded-lg appearance-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="">Select category...</option>
                  <option value="groceries">🛒 Groceries</option>
                  <option value="utilities">⚡ Utilities</option>
                  <option value="transportation">🚗 Transportation</option>
                  <option value="healthcare">🏥 Healthcare</option>
                  <option value="entertainment">🎬 Entertainment</option>
                  <option value="dining">🍽️ Dining</option>
                  <option value="shopping">🛍️ Shopping</option>
                  <option value="housing">🏠 Housing</option>
                  <option value="insurance">🛡️ Insurance</option>
                  <option value="education">📚 Education</option>
                  <option value="other">📌 Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Custom Category Input - shows when "Other" is selected */}
          {formData.category === 'other' && (
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium mb-2 cursor-pointer">Custom Category *</label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}
          <div>
            <label htmlFor="field-5" className="block text-sm font-medium mb-2 cursor-pointer">Due Date</label>
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
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!dateError}
              className={`flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl transition-all shadow-lg font-medium ${
                dateError ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {editExpense ? 'Save Expense' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
      {/* Emoji Picker Portal */}
      {showEmojiPicker && emojiButtonRect && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 z-[9999] w-full sm:w-80 max-w-[calc(100vw-2rem)]"
          style={{
            top: `${emojiButtonRect.bottom + 8}px`,
            left: `${Math.max(16, emojiButtonRect.right - 320)}px`,
          }}
        >
          <h4 className="text-base sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select an emoji</h4>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Click to add emoji"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
