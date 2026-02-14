'use client';

import { useState } from 'react';
import { Chore } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

interface UpdateProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (choreId: string, completion: number, notes: string) => void;
  chore: Chore | null;
}

const buildInitialProgress = (chore: Chore | null) => ({
  completion: chore?.completion_percentage || 0,
  notes: chore?.notes || '',
});

function ProgressForm({
  isOpen,
  onClose,
  onSave,
  chore,
}: UpdateProgressModalProps) {
  const initial = buildInitialProgress(chore);
  const [completion, setCompletion] = useState<number>(initial.completion);
  const [notes, setNotes] = useState<string>(initial.notes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chore) {
      onSave(chore.id, completion, notes);
      onClose();
    }
  };

  if (!chore) return null;

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="update-progress-form"
        className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full hover:opacity-90 transition-all shadow-lg font-medium"
      >
        Update Progress
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Progress"
      subtitle={chore.title}
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-orange-500 to-amber-600"
      footer={footerContent}
    >
      <form id="update-progress-form" onSubmit={handleSubmit} className="space-y-6">
        {chore.description && (
          <p className="text-sm text-gray-400">{chore.description}</p>
        )}

        <div>
          <label htmlFor="completion-range" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
            Completion Percentage: {completion}%
          </label>
          <input
            id="completion-range"
            type="range"
            min="0"
            max="100"
            step="5"
            value={completion}
            onChange={(e) => setCompletion(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Progress preview */}
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">Preview</p>
          <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
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
          <label htmlFor="progress-notes" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
            Notes / Remarks (Optional)
          </label>
          <textarea
            id="progress-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about progress, challenges, or updates..."
            rows={4}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}

/** Renders a modal for updating project completion progress. */
export function UpdateProgressModal(props: UpdateProgressModalProps) {
  const { chore, isOpen } = props;
  const formKey = `${chore?.id ?? 'none'}-${isOpen ? 'open' : 'closed'}`;
  return <ProgressForm key={formKey} {...props} />;
}
