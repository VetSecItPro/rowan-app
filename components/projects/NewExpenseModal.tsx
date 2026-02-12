'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import { CreateExpenseInput, Expense } from '@/lib/services/budgets-service';
import { CategorySelector } from '@/components/categories/CategorySelector';
import { Modal } from '@/components/ui/Modal';

// Expense-appropriate emojis
const EMOJIS = ['💰', '💵', '💳', '💸', '🏦', '🛒', '🍽️', '☕', '⚡', '🏠', '🚗', '⛽', '💊', '🏥', '🎬', '🎮', '📚', '✈️', '🏨', '👕'];

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: CreateExpenseInput) => void;
  editExpense?: Expense | null;
  spaceId: string;
}

const buildInitialFormData = (editExpense: Expense | null | undefined, spaceId: string): CreateExpenseInput => {
  if (editExpense) {
    return {
      space_id: spaceId,
      title: editExpense.title,
      amount: editExpense.amount,
      category: editExpense.category || '',
      status: editExpense.status,
      due_date: editExpense.due_date || '',
      recurring: editExpense.recurring || false,
    };
  }

  return {
    space_id: spaceId,
    title: '',
    amount: 0,
    category: '',
    status: 'pending',
    due_date: '',
    recurring: false,
  };
};

function ExpenseForm({ isOpen, onClose, onSave, editExpense, spaceId }: NewExpenseModalProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    ...buildInitialFormData(editExpense, spaceId),
  });
  const [dateError, setDateError] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiButtonRect, setEmojiButtonRect] = useState<DOMRect | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
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
        disabled={!!dateError}
        className={`flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full transition-all shadow-lg shadow-amber-500/25 font-medium ${
          dateError ? 'opacity-50 cursor-not-allowed' : 'hover:from-amber-600 hover:to-amber-700'
        }`}
      >
        {editExpense ? 'Save Expense' : 'Create Expense'}
      </button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editExpense ? 'Edit Expense' : 'Create New Expense'}
        maxWidth="lg"
        headerGradient="bg-gradient-to-r from-amber-500 to-amber-600"
        footer={footerContent}
      >
        <form id="new-expense-form" onSubmit={(e) => {
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

          // Set category from selector (which handles both custom and predefined categories)
          if (formData.category && formData.category.trim() !== '') {
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
                className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm pr-12 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium mb-2 cursor-pointer">Amount *</label>
              <input type="number" inputMode="numeric" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-900 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="field-3" className="block text-sm font-medium mb-2 cursor-pointer">Category</label>
              <CategorySelector
                value={formData.category}
                onChange={(value) => {
                  setFormData({ ...formData, category: value });
                }}
                domain="expense"
                placeholder="Select category..."
                allowCustom={true}
                showIcon={true}
              />
            </div>
          </div>

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
              className={`w-full px-4 py-2 bg-gray-800/60 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white ${
                dateError ? 'border-red-500' : 'border-gray-700/50'
              }`}
            />
            {dateError && (
              <p className="mt-2 text-base md:text-sm text-red-400 flex items-center gap-1">
                <span className="font-medium">⚠</span>
                {dateError}
              </p>
            )}
          </div>
        </form>
      </Modal>
      {/* Emoji Picker Portal */}
      {showEmojiPicker && emojiButtonRect && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 z-[9999] w-full sm:w-80 max-w-[calc(100vw-2rem)]"
          style={{
            top: `${emojiButtonRect.bottom + 8}px`,
            left: `${Math.max(16, emojiButtonRect.right - 320)}px`,
          }}
        >
          <h4 className="text-base sm:text-sm font-medium text-gray-300 mb-3">Select an emoji</h4>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
                title="Click to add emoji"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function NewExpenseModal(props: NewExpenseModalProps) {
  const { editExpense, isOpen, spaceId } = props;
  const formKey = `${editExpense?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}-${spaceId}`;
  return <ExpenseForm key={formKey} {...props} />;
}
