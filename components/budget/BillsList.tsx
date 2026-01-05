'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BillCard } from '@/components/projects/BillCard';
import { logger } from '@/lib/logger';
import {
  getBills,
  getBillsByStatus,
  type Bill,
  type BillStatus,
} from '@/lib/services/bills-service';
import {
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface BillsListProps {
  spaceId: string;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
  onMarkPaid: (billId: string) => void;
  onCreateNew?: () => void;
}

type SortOption = 'due_date' | 'amount' | 'name';
type SortDirection = 'asc' | 'desc';

export function BillsList({
  spaceId,
  onEdit,
  onDelete,
  onMarkPaid,
  onCreateNew,
}: BillsListProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch bills with RLS security enforced by service layer
  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch all bills and filter locally for optimistic UI
      const fetchedBills = await getBills(spaceId);
      setBills(fetchedBills);
    } catch (err) {
      logger.error('Error fetching bills:', err, { component: 'BillsList', action: 'component_action' });
      setError('Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!spaceId) {
      setError('Invalid space ID');
      setLoading(false);
      return;
    }

    fetchBills();
  }, [spaceId]);

  // Real-time subscription with RLS security
  useEffect(() => {
    if (!spaceId) return;

    const supabase = createClient();
    const channel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `space_id=eq.${spaceId}`, // RLS security filter
        },
        () => {
          fetchBills(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

  // Filter and sort bills
  const processedBills = useMemo(() => {
    let filtered = [...bills];

    // Status filter (optimistic - no refetch)
    if (statusFilter !== 'all') {
      filtered = filtered.filter((bill) => bill.status === statusFilter);
    }

    // Search filter (case-insensitive, sanitized)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (bill) =>
          bill.name.toLowerCase().includes(query) ||
          bill.payee?.toLowerCase().includes(query) ||
          bill.category?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'due_date':
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [bills, statusFilter, searchQuery, sortBy, sortDirection]);

  // Toggle sort direction
  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  // Status filter options
  const statusOptions: Array<{ value: BillStatus | 'all'; label: string; color: string }> = [
    { value: 'all', label: 'All Bills', color: 'gray' },
    { value: 'scheduled', label: 'Scheduled', color: 'blue' },
    { value: 'paid', label: 'Paid', color: 'green' },
    { value: 'overdue', label: 'Overdue', color: 'red' },
    { value: 'cancelled', label: 'Cancelled', color: 'gray' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading bills...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-900 dark:text-white font-medium mb-2">Error Loading Bills</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchBills}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search bills by name, payee, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border-2 border-amber-300 dark:border-amber-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Filter and Sort Controls - Same Line */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options - Right Justified */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleSort('due_date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'due_date'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Due Date
                {sortBy === 'due_date' &&
                  (sortDirection === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  ))}
              </button>
              <button
                onClick={() => toggleSort('amount')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'amount'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Amount
                {sortBy === 'amount' &&
                  (sortDirection === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  ))}
              </button>
              <button
                onClick={() => toggleSort('name')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'name'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Name
                {sortBy === 'name' &&
                  (sortDirection === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  ))}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bills Grid */}
      {processedBills.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Bills Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? 'No bills match your search criteria.'
              : statusFilter !== 'all'
              ? `No ${statusFilter} bills found.`
              : 'Get started by adding your first bill.'}
          </p>
          {onCreateNew && statusFilter === 'all' && !searchQuery && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Bill
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {processedBills.length} {processedBills.length === 1 ? 'bill' : 'bills'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onEdit={onEdit}
                onDelete={onDelete}
                onMarkPaid={onMarkPaid}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
