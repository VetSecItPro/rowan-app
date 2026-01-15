'use client';

import { Calendar, DollarSign, TrendingUp, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { RecurringExpensePattern } from '@/lib/services/recurring-expenses-service';

interface PatternCardProps {
  pattern: RecurringExpensePattern;
  onAction?: (action: 'confirm' | 'ignore' | 'create') => void;
  isProcessing?: boolean;
  className?: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Every 2 weeks',
  monthly: 'Monthly',
  'bi-monthly': 'Every 2 months',
  quarterly: 'Quarterly',
  'semi-annual': 'Twice yearly',
  annual: 'Yearly',
};

export function PatternCard({ pattern, onAction, isProcessing = false, className = '' }: PatternCardProps) {
  // Determine confidence level and colors
  const getConfidenceLevel = (score: number) => {
    if (score >= 80) return { label: 'High', color: 'green' };
    if (score >= 60) return { label: 'Medium', color: 'amber' };
    return { label: 'Low', color: 'red' };
  };

  const confidence = getConfidenceLevel(pattern.confidence_score);

  const colorMap = {
    green: {
      bg: 'bg-green-900/30',
      text: 'text-green-300',
      ring: 'ring-green-500',
      bar: 'bg-green-500',
    },
    amber: {
      bg: 'bg-amber-900/30',
      text: 'text-amber-300',
      ring: 'ring-amber-500',
      bar: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-900/30',
      text: 'text-red-300',
      ring: 'ring-red-500',
      bar: 'bg-red-500',
    },
  };

  const confidenceColors = colorMap[confidence.color as keyof typeof colorMap] || colorMap.amber;

  // Format next expected date
  const nextDate = pattern.next_expected_date
    ? new Date(pattern.next_expected_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div
      className={`bg-gray-800 rounded-lg p-5 border-2 border-gray-700 hover:shadow-lg transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1 truncate">
            {pattern.pattern_name}
          </h3>
          {pattern.merchant_name && (
            <p className="text-sm text-gray-400 truncate">
              {pattern.merchant_name}
            </p>
          )}
          {pattern.category && (
            <div className="inline-block mt-1">
              <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                {pattern.category}
              </span>
            </div>
          )}
        </div>

        {/* Confidence Badge */}
        <div
          className={`flex-shrink-0 ml-3 px-3 py-1 rounded-full ${confidenceColors.bg} ring-2 ${confidenceColors.ring}`}
        >
          <div className="text-center">
            <div className={`text-lg font-bold ${confidenceColors.text}`}>
              {pattern.confidence_score}%
            </div>
            <div className={`text-xs ${confidenceColors.text}`}>{confidence.label}</div>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${confidenceColors.bar} transition-all`}
            style={{ width: `${pattern.confidence_score}%` }}
          />
        </div>
      </div>

      {/* Pattern Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Average Amount */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-400">Avg. Amount</span>
          </div>
          <div className="text-lg font-bold text-white">
            ${pattern.average_amount.toLocaleString()}
          </div>
          {pattern.amount_variance > 0 && (
            <div className="text-xs text-gray-400">
              ±${pattern.amount_variance.toFixed(2)}
            </div>
          )}
        </div>

        {/* Frequency */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-400">Frequency</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {FREQUENCY_LABELS[pattern.frequency] || pattern.frequency}
          </div>
        </div>

        {/* Occurrences */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-400">Occurrences</span>
          </div>
          <div className="text-lg font-bold text-white">
            {pattern.occurrence_count}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(pattern.first_occurrence).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}{' '}
            -
            {new Date(pattern.last_occurrence).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Next Expected */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-400">Next Expected</span>
          </div>
          <div className="text-sm font-semibold text-white">{nextDate}</div>
          {pattern.next_expected_amount && (
            <div className="text-xs text-gray-400">
              ~${pattern.next_expected_amount.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        {pattern.user_confirmed && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-300 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </div>
        )}
        {pattern.user_ignored && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 rounded-full">
            <AlertCircle className="w-3 h-3" />
            <span>Ignored</span>
          </div>
        )}
        {pattern.auto_created && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/20 text-blue-300 rounded-full">
            <span>Auto-detected</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {onAction && !pattern.user_confirmed && !pattern.user_ignored && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction('confirm')}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
          <button
            onClick={() => onAction('create')}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Expense
          </button>
          <button
            onClick={() => onAction('ignore')}
            disabled={isProcessing}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ignore
          </button>
        </div>
      )}
    </div>
  );
}
