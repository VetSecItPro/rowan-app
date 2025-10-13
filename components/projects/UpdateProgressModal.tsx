'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { Chore } from '@/lib/services/budgets-service';

interface UpdateProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (choreId: string, completion: number, notes: string) => void;
  chore: Chore | null;
}

export function UpdateProgressModal({
  isOpen,
  onClose,
  onSave,
  chore,
}: UpdateProgressModalProps) {
  const [completion, setCompletion] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen && chore) {
      setCompletion(chore.completion_percentage || 0);
      setNotes(chore.notes || '');
    }
  }, [isOpen, chore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chore) {
      onSave(chore.id, completion, notes);
      onClose();
    }
  };

  if (!isOpen || !chore) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-projects rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Update Progress
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{chore.title}</h3>
            {chore.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{chore.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Completion Percentage: {completion}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={completion}
              onChange={(e) => setCompletion(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  completion < 30
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : completion < 70
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-green-400 to-green-500'
                }`}
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes / Remarks (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about progress, challenges, or updates..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
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
              Update Progress
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
