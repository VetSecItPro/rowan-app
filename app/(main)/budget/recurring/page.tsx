'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { RecurringPatternsList } from '@/components/expenses/RecurringPatternsList';
import { DuplicateSubscriptions } from '@/components/expenses/DuplicateSubscriptions';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { logger } from '@/lib/logger';
import {
  analyzeRecurringPatterns,
  getRecurringPatterns,
  confirmPattern,
  ignorePattern,
  type RecurringExpensePattern,
} from '@/lib/services/recurring-expenses-service';
import { useRouter } from 'next/navigation';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

// Mock duplicate detection for now - this would come from the service
interface DuplicateGroup {
  patterns: RecurringExpensePattern[];
  similarity: number;
  totalCost: number;
}

export default function RecurringExpensesPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const router = useRouter();

  const [patterns, setPatterns] = useState<RecurringExpensePattern[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patterns
  const loadPatterns = useCallback(async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getRecurringPatterns(spaceId);
      setPatterns(data);

      // Detect duplicates (simplified version)
      const potentialDuplicates = detectDuplicates(data);
      setDuplicates(potentialDuplicates);
    } catch (err) {
      logger.error('Failed to load patterns:', err, { component: 'page', action: 'execution' });
      setError('Failed to load recurring patterns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  // Run analysis
  const handleAnalyze = async () => {
    if (!spaceId) return;

    try {
      setAnalyzing(true);
      setError(null);

      await analyzeRecurringPatterns(spaceId);
      await loadPatterns();
    } catch (err) {
      logger.error('Failed to analyze patterns:', err, { component: 'page', action: 'execution' });
      setError('Failed to analyze recurring patterns. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle pattern actions
  const handlePatternAction = async (
    patternId: string,
    action: 'confirm' | 'ignore' | 'create'
  ) => {
    if (!spaceId) return;

    try {
      if (action === 'confirm') {
        await confirmPattern(patternId);
      } else if (action === 'ignore') {
        await ignorePattern(patternId);
      } else if (action === 'create') {
        // Navigate to expense creation with pattern data
        router.push(`/budget/expenses/new?patternId=${patternId}`);
        return;
      }

      // Reload patterns after action
      await loadPatterns();
    } catch (err) {
      logger.error('Failed to process pattern action:', err, { component: 'page', action: 'execution' });
      throw err;
    }
  };

  // Handle duplicate dismissal
  const handleDismissDuplicate = async (patternIds: string[]) => {
    // In a real implementation, this would mark duplicates as reviewed
    setDuplicates((prev) => prev.filter((group) => {
      const groupIds = group.patterns.map((p) => p.id);
      return !patternIds.some((id) => groupIds.includes(id));
    }));
  };

  // Handle duplicate review
  const handleReviewDuplicate = (group: DuplicateGroup) => {
    // Navigate to a comparison view or modal
    logger.info('Review duplicate group:', { component: 'page', data: group });
    // TODO: Implement duplicate review modal
  };

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget', href: '/projects?tab=budgets' },
        { label: 'Recurring Expenses' },
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Recurring Expenses
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Automatically detect and manage your recurring expenses and subscriptions
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border-2 border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-100 mb-2">
                  AI-Powered Pattern Detection
                </h3>
                <p className="text-sm text-purple-200 mb-3">
                  Our ML algorithm analyzes your expense history to automatically detect recurring
                  patterns like subscriptions, bills, and regular payments. Review and confirm
                  patterns to improve accuracy over time.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Run New Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Duplicate Subscriptions Alert */}
          {duplicates.length > 0 && (
            <DuplicateSubscriptions
              duplicates={duplicates}
              onDismiss={handleDismissDuplicate}
              onReview={handleReviewDuplicate}
            />
          )}

          {/* Patterns List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading recurring patterns...</p>
            </div>
          ) : (
            <RecurringPatternsList
              patterns={patterns}
              onPatternAction={handlePatternAction}
              onRefresh={handleAnalyze}
              isRefreshing={analyzing}
            />
          )}
        </div>
      </div>
    </FeatureLayout>
  );
}

// Helper function to detect potential duplicates
function detectDuplicates(patterns: RecurringExpensePattern[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  // Group by similar category and frequency
  const grouped = new Map<string, RecurringExpensePattern[]>();

  patterns.forEach((pattern) => {
    const key = `${pattern.category}-${pattern.frequency}`;
    const existing = grouped.get(key) || [];
    existing.push(pattern);
    grouped.set(key, existing);
  });

  // Find groups with multiple patterns
  grouped.forEach((groupPatterns) => {
    if (groupPatterns.length > 1) {
      // Calculate similarity (simplified - real implementation would use more sophisticated matching)
      const similarity = 75 + Math.random() * 20; // Mock: 75-95% similarity
      const totalCost = groupPatterns.reduce((sum, p) => sum + p.average_amount, 0);

      groups.push({
        patterns: groupPatterns,
        similarity: Math.round(similarity),
        totalCost,
      });
    }
  });

  return groups;
}
