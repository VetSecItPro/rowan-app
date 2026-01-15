'use client';

import { AlertTriangle, X, Copy } from 'lucide-react';
import type { RecurringExpensePattern } from '@/lib/services/recurring-expenses-service';

interface DuplicateGroup {
  patterns: RecurringExpensePattern[];
  similarity: number;
  totalCost: number;
}

interface DuplicateSubscriptionsProps {
  duplicates: DuplicateGroup[];
  onDismiss?: (patternIds: string[]) => void;
  onReview?: (group: DuplicateGroup) => void;
  className?: string;
}

export function DuplicateSubscriptions({
  duplicates,
  onDismiss,
  onReview,
  className = '',
}: DuplicateSubscriptionsProps) {
  if (duplicates.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {duplicates.map((group, index) => {
        const totalMonthly = group.patterns.reduce((sum, p) => {
          // Normalize to monthly cost
          const monthlyAmount = normalizeToMonthly(p.average_amount, p.frequency);
          return sum + monthlyAmount;
        }, 0);

        const patternIds = group.patterns.map((p) => p.id);

        return (
          <div
            key={`duplicate-group-${index}`}
            className="bg-amber-900/20 border-2 border-amber-600 rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-amber-100 mb-1">
                  Potential Duplicate Subscriptions Detected
                </h3>
                <p className="text-sm text-amber-200">
                  Found {group.patterns.length} similar recurring expenses that might be duplicates.
                  You could save ${totalMonthly.toLocaleString()}/month by consolidating.
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(patternIds)}
                  className="flex-shrink-0 p-1 rounded-lg text-amber-300 hover:bg-amber-900/40 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Duplicate Patterns List */}
            <div className="space-y-2 mb-3">
              {group.patterns.map((pattern) => {
                const monthlyAmount = normalizeToMonthly(pattern.average_amount, pattern.frequency);

                return (
                  <div
                    key={pattern.id}
                    className="bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Copy className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="font-medium text-white truncate">
                          {pattern.pattern_name}
                        </span>
                      </div>
                      {pattern.merchant_name && (
                        <div className="text-xs text-gray-400 truncate">
                          {pattern.merchant_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {getFrequencyLabel(pattern.frequency)} •
                        {pattern.occurrence_count} occurrences
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <div className="text-lg font-bold text-amber-600">
                        ${pattern.average_amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        ${monthlyAmount.toLocaleString()}/mo
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Similarity Score */}
            <div className="bg-amber-900/30 rounded-lg p-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-200">Similarity Score:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-amber-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600"
                      style={{ width: `${group.similarity}%` }}
                    />
                  </div>
                  <span className="font-bold text-amber-100">
                    {group.similarity}%
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {onReview && (
              <button
                onClick={() => onReview(group)}
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Review and Consolidate
              </button>
            )}

            {/* Help Text */}
            <p className="text-xs text-amber-300 text-center mt-2">
              Review these expenses to determine if they're truly duplicates or separate services
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function normalizeToMonthly(amount: number, frequency: string): number {
  const multipliers: Record<string, number> = {
    daily: 30,
    weekly: 4.33,
    'bi-weekly': 2.17,
    monthly: 1,
    'bi-monthly': 0.5,
    quarterly: 0.33,
    'semi-annual': 0.17,
    annual: 0.08,
  };

  return Math.round(amount * (multipliers[frequency] || 1) * 100) / 100;
}

function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    'bi-weekly': 'Bi-weekly',
    monthly: 'Monthly',
    'bi-monthly': 'Bi-monthly',
    quarterly: 'Quarterly',
    'semi-annual': 'Semi-annual',
    annual: 'Annual',
  };

  return labels[frequency] || frequency;
}
