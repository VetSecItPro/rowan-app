'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, DollarSign, Calendar, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import {
  mergePatterns,
  type RecurringExpensePattern,
} from '@/lib/services/recurring-expenses-service';
import { logger } from '@/lib/logger';

interface DuplicateGroup {
  patterns: RecurringExpensePattern[];
  similarity: number;
  totalCost: number;
}

interface DuplicateReviewModalProps {
  isOpen: boolean;
  group: DuplicateGroup | null;
  onClose: () => void;
  onMerged: () => void;
}

/** Side-by-side comparison of duplicate recurring patterns with merge action. */
export function DuplicateReviewModal({
  isOpen,
  group,
  onClose,
  onMerged,
}: DuplicateReviewModalProps) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (group && group.patterns.length > 0) {
      setWinnerId(group.patterns[0].id);
    } else {
      setWinnerId(null);
    }
  }, [group]);

  if (!group || group.patterns.length < 2) return null;

  const handleMerge = async () => {
    if (!winnerId) return;
    const loserIds = group.patterns.filter((p) => p.id !== winnerId).map((p) => p.id);
    setMerging(true);
    try {
      await mergePatterns(winnerId, loserIds);
      toast.success(`Merged ${loserIds.length} duplicate${loserIds.length === 1 ? '' : 's'} into the chosen pattern`);
      onMerged();
      onClose();
    } catch (err) {
      logger.error('Failed to merge patterns', err, { component: 'DuplicateReviewModal' });
      toast.error('Could not merge patterns. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={merging}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleMerge}
        disabled={!winnerId || merging}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full transition-all shadow-lg shadow-purple-500/25 font-medium disabled:opacity-50"
      >
        {merging ? 'Merging...' : `Merge ${group.patterns.length - 1} into chosen`}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Duplicate Subscriptions"
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-purple-500 to-purple-600"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100">
            <p className="font-medium mb-1">
              {group.patterns.length} similar recurring patterns detected ({group.similarity}% match)
            </p>
            <p className="text-amber-200/80">
              Pick the canonical pattern to keep. The others will be marked as duplicates and excluded from analysis.
              Their expense history is preserved and merged into the chosen pattern.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {group.patterns.map((pattern) => {
            const isWinner = pattern.id === winnerId;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => setWinnerId(pattern.id)}
                aria-pressed={isWinner}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isWinner
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {pattern.pattern_name}
                    </h4>
                    {pattern.merchant_name && (
                      <p className="text-sm text-gray-400 truncate">
                        {pattern.merchant_name}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isWinner ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                    }`}
                  >
                    {isWinner && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>${pattern.average_amount.toFixed(2)} / {pattern.frequency}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{pattern.occurrence_count} charges</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>since {format(parseISO(pattern.first_occurrence), 'MMM yyyy')}</span>
                  </div>
                </div>

                {pattern.category && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                      {pattern.category}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
