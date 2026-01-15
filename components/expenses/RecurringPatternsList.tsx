'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Filter, SortAsc, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { PatternCard } from './PatternCard';
import type { RecurringExpensePattern } from '@/lib/services/recurring-expenses-service';

interface RecurringPatternsListProps {
  patterns: RecurringExpensePattern[];
  onPatternAction?: (patternId: string, action: 'confirm' | 'ignore' | 'create') => Promise<void>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  className?: string;
}

type SortOption = 'confidence' | 'amount' | 'frequency' | 'recent';
type FilterOption = 'all' | 'unconfirmed' | 'confirmed' | 'ignored';

export function RecurringPatternsList({
  patterns,
  onPatternAction,
  onRefresh,
  isRefreshing = false,
  className = '',
}: RecurringPatternsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [processingPatterns, setProcessingPatterns] = useState<Set<string>>(new Set());

  // Filter and sort patterns - using debounced search to prevent excessive recalculations
  const filteredAndSortedPatterns = useMemo(() => {
    let result = [...patterns];

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.pattern_name.toLowerCase().includes(query) ||
          p.merchant_name?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (filterBy) {
      case 'unconfirmed':
        result = result.filter((p) => !p.user_confirmed && !p.user_ignored);
        break;
      case 'confirmed':
        result = result.filter((p) => p.user_confirmed);
        break;
      case 'ignored':
        result = result.filter((p) => p.user_ignored);
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        case 'amount':
          return b.average_amount - a.average_amount;
        case 'frequency':
          return b.occurrence_count - a.occurrence_count;
        case 'recent':
          return new Date(b.last_occurrence).getTime() - new Date(a.last_occurrence).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [patterns, debouncedSearchQuery, sortBy, filterBy]);

  const handleAction = async (patternId: string, action: 'confirm' | 'ignore' | 'create') => {
    if (!onPatternAction) return;

    setProcessingPatterns((prev) => new Set(prev).add(patternId));
    try {
      await onPatternAction(patternId, action);
    } finally {
      setProcessingPatterns((prev) => {
        const next = new Set(prev);
        next.delete(patternId);
        return next;
      });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = patterns.length;
    const unconfirmed = patterns.filter((p) => !p.user_confirmed && !p.user_ignored).length;
    const confirmed = patterns.filter((p) => p.user_confirmed).length;
    const avgConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length
        : 0;

    return { total, unconfirmed, confirmed, avgConfidence: Math.round(avgConfidence) };
  }, [patterns]);

  if (patterns.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-8 text-center ${className}`}>
        <RefreshCw className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
        <h3 className="text-lg font-semibold text-white mb-2">
          No Recurring Patterns Detected
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          We haven't found any recurring expense patterns yet. This could mean:
        </p>
        <ul className="text-sm text-gray-400 text-left max-w-md mx-auto space-y-1 mb-4">
          <li>• Not enough expense history (need at least 3 occurrences)</li>
          <li>• No expenses match recurring patterns</li>
          <li>• Analysis needs to be run</li>
        </ul>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run Analysis
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats Bar */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Total Patterns</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Needs Review</div>
            <div className="text-2xl font-bold text-amber-600">{stats.unconfirmed}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Confirmed</div>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Avg. Confidence</div>
            <div className="text-2xl font-bold text-blue-600">{stats.avgConfidence}%</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patterns..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Patterns</option>
              <option value="unconfirmed">Needs Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="confidence">Highest Confidence</option>
              <option value="amount">Highest Amount</option>
              <option value="frequency">Most Frequent</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-auto px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </>
              )}
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedPatterns.length} of {patterns.length} patterns
        </div>
      </div>

      {/* Patterns Grid */}
      {filteredAndSortedPatterns.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-700">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-400">
            No patterns match your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAndSortedPatterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onAction={(action) => handleAction(pattern.id, action)}
              isProcessing={processingPatterns.has(pattern.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
