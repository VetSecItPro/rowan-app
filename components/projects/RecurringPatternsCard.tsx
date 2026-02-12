'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Check, X, Plus, Calendar } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  type RecurringExpensePattern,
  getRecurringPatterns,
  analyzeRecurringPatterns,
  detectDuplicateSubscriptions,
  confirmPattern,
  ignorePattern,
  createExpenseFromPattern,
  getUpcomingRecurring,
} from '@/lib/services/recurring-expenses-service';
import { showSuccess, showError } from '@/lib/utils/toast';

interface RecurringPatternsCardProps {
  spaceId: string;
  userId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  'bi-monthly': 'Bi-monthly',
  quarterly: 'Quarterly',
  'semi-annual': 'Semi-annual',
  annual: 'Annual',
};

export function RecurringPatternsCard({ spaceId, userId }: RecurringPatternsCardProps) {
  const [patterns, setPatterns] = useState<RecurringExpensePattern[]>([]);
  const [upcomingPatterns, setUpcomingPatterns] = useState<RecurringExpensePattern[]>([]);
  const [duplicates, setDuplicates] = useState<RecurringExpensePattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'detected' | 'upcoming' | 'duplicates'>('detected');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPatterns is a stable function
  }, [spaceId]);

  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      const [detectedPatterns, upcoming, possibleDuplicates] = await Promise.all([
        getRecurringPatterns(spaceId),
        getUpcomingRecurring(spaceId),
        detectDuplicateSubscriptions(spaceId),
      ]);
      setPatterns(detectedPatterns);
      setUpcomingPatterns(upcoming);
      setDuplicates(possibleDuplicates);
    } catch (error) {
      logger.error('Error loading patterns:', error, { component: 'RecurringPatternsCard', action: 'component_action' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeRecurringPatterns(spaceId);
      await loadPatterns();
    } catch (error) {
      logger.error('Error analyzing patterns:', error, { component: 'RecurringPatternsCard', action: 'component_action' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async (patternId: string) => {
    try {
      await confirmPattern(patternId);
      await loadPatterns();
    } catch (error) {
      logger.error('Error confirming pattern:', error, { component: 'RecurringPatternsCard', action: 'component_action' });
    }
  };

  const handleIgnore = async (patternId: string) => {
    try {
      await ignorePattern(patternId);
      await loadPatterns();
    } catch (error) {
      logger.error('Error ignoring pattern:', error, { component: 'RecurringPatternsCard', action: 'component_action' });
    }
  };

  const handleCreateExpense = async (patternId: string) => {
    try {
      const result = await createExpenseFromPattern(patternId, userId);
      if (result.success) {
        await loadPatterns();
        showSuccess('Expense created successfully!');
      } else {
        showError(`Error: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error creating expense:', error, { component: 'RecurringPatternsCard', action: 'component_action' });
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Recurring Expenses</h3>
              <p className="text-sm text-gray-400">
                Detected patterns and upcoming bills
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Patterns'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('detected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'detected'
                ? 'bg-purple-900/30 text-purple-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Detected ({patterns.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-purple-900/30 text-purple-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Upcoming ({upcomingPatterns.length})
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'duplicates'
                ? 'bg-purple-900/30 text-purple-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            {duplicates.length > 0 && (
              <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500" />
            )}
            Duplicates ({duplicates.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'detected' && (
          <div className="space-y-4">
            {patterns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recurring patterns detected yet.</p>
                <p className="text-sm mt-1">Click &quot;Analyze Patterns&quot; to scan your expense history.</p>
              </div>
            ) : (
              patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="border border-gray-700 rounded-lg p-4 hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-white">
                          {pattern.pattern_name}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(
                            pattern.confidence_score
                          )} bg-opacity-10`}
                        >
                          {getConfidenceBadge(pattern.confidence_score)} Confidence ({pattern.confidence_score}%)
                        </span>
                        {pattern.user_confirmed && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="font-medium">Frequency:</span> {FREQUENCY_LABELS[pattern.frequency]}
                        </div>
                        <div>
                          <span className="font-medium">Average:</span> ${pattern.average_amount.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {pattern.category || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Occurrences:</span> {pattern.occurrence_count}
                        </div>
                      </div>
                      {pattern.next_expected_date && (
                        <div className="mt-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Next expected: {new Date(pattern.next_expected_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!pattern.user_confirmed && (
                        <button
                          onClick={() => handleConfirm(pattern.id)}
                          className="p-2 text-green-600 hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Confirm pattern"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleIgnore(pattern.id)}
                        className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Ignore pattern"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingPatterns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming recurring expenses in the next 30 days.</p>
              </div>
            ) : (
              upcomingPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="border border-gray-700 rounded-lg p-4 hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-2">
                        {pattern.pattern_name}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="font-medium">Due:</span>{' '}
                          {pattern.next_expected_date
                            ? new Date(pattern.next_expected_date).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> $
                          {(pattern.next_expected_amount || pattern.average_amount).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Frequency:</span> {FREQUENCY_LABELS[pattern.frequency]}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {pattern.category || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateExpense(pattern.id)}
                      className="p-2 text-purple-600 hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Create expense now"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            {duplicates.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                <p>No duplicate subscriptions detected.</p>
                <p className="text-sm mt-1">All your recurring expenses look unique!</p>
              </div>
            ) : (
              <>
                <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-100">
                        Potential Duplicate Subscriptions
                      </h4>
                      <p className="text-sm text-orange-300 mt-1">
                        We found multiple recurring expenses in the same category. Review them to see if any are
                        duplicates.
                      </p>
                    </div>
                  </div>
                </div>
                {duplicates.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="border border-orange-800 bg-orange-900/10 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-2">
                          {pattern.pattern_name}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                          <div>
                            <span className="font-medium">Frequency:</span> {FREQUENCY_LABELS[pattern.frequency]}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> ${pattern.average_amount.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {pattern.category || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Occurrences:</span> {pattern.occurrence_count}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleIgnore(pattern.id)}
                        className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Not a duplicate"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
