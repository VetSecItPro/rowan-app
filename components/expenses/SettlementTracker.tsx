'use client';

import { useState, useMemo } from 'react';
import { History, ArrowRightLeft, Trash2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import type { Settlement } from '@/lib/services/expense-splitting-service';
import { logger } from '@/lib/logger';

interface SettlementTrackerProps {
  settlements: Settlement[];
  currentUserId: string;
  onDelete?: (settlementId: string) => Promise<void>;
  className?: string;
}

/** Tracks and displays expense settlement status between space members. */
export function SettlementTracker({
  settlements,
  currentUserId,
  onDelete,
  className = '',
}: SettlementTrackerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group settlements by month
  const settlementsByMonth = useMemo(() => {
    const grouped: Record<string, Settlement[]> = {};

    settlements.forEach((settlement) => {
      const monthKey = new Date(settlement.settlement_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(settlement);
    });

    // Sort by date descending
    const sorted: Record<string, Settlement[]> = {};
    Object.keys(grouped)
      .sort((a, b) => {
        const dateA = new Date(grouped[a][0].settlement_date);
        const dateB = new Date(grouped[b][0].settlement_date);
        return dateB.getTime() - dateA.getTime();
      })
      .forEach((key) => {
        sorted[key] = grouped[key].sort((a, b) => {
          return new Date(b.settlement_date).getTime() - new Date(a.settlement_date).getTime();
        });
      });

    return sorted;
  }, [settlements]);

  // Calculate totals
  const totalSettled = useMemo(() => {
    return settlements.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);
  }, [settlements]);

  const handleDelete = async (settlementId: string) => {
    if (!onDelete) return;

    setDeletingId(settlementId);
    setError(null);

    try {
      await onDelete(settlementId);
    } catch (err) {
      logger.error('Failed to delete settlement:', err, { component: 'SettlementTracker', action: 'component_action' });
      setError('Failed to delete settlement. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (settlements.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="text-center py-8 text-gray-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No settlement history yet</p>
          <p className="text-xs mt-1">Settlements will appear here when payments are recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-white">Settlement History</h3>
        </div>
        <div className="text-sm text-gray-400">
          {settlements.length} settlement{settlements.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Total Settled */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Total Settled</span>
          <span className="text-2xl font-bold text-emerald-600">
            ${totalSettled.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {/* Settlements by Month */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {Object.entries(settlementsByMonth).map(([month, monthSettlements]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gray-900 py-2 z-10">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-300">{month}</h4>
              <div className="text-xs text-gray-400">
                ({monthSettlements.length})
              </div>
            </div>

            {/* Settlements */}
            <div className="space-y-2">
              {monthSettlements.map((settlement) => {
                const isFromCurrentUser = settlement.from_user_id === currentUserId;
                const isDeleting = deletingId === settlement.id;

                return (
                  <div
                    key={settlement.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Settlement Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowRightLeft
                            className={`w-4 h-4 flex-shrink-0 ${
                              isFromCurrentUser
                                ? 'text-red-400'
                                : 'text-green-400'
                            }`}
                          />
                          <span className="text-sm font-medium text-white">
                            {isFromCurrentUser ? 'You paid' : 'You received'}
                          </span>
                          <span className="text-lg font-bold text-emerald-600">
                            ${parseFloat(settlement.amount.toString()).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs text-gray-400 space-y-1">
                          <div>
                            {new Date(settlement.settlement_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>

                          {settlement.payment_method && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>via {settlement.payment_method}</span>
                            </div>
                          )}

                          {settlement.reference_number && (
                            <div>Ref: {settlement.reference_number}</div>
                          )}

                          {settlement.notes && (
                            <div className="text-gray-400 italic">
                              {settlement.notes}
                            </div>
                          )}

                          {settlement.expense_ids && settlement.expense_ids.length > 0 && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <span>{settlement.expense_ids.length} expense{settlement.expense_ids.length !== 1 ? 's' : ''} settled</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      {onDelete && (
                        <button
                          onClick={() => handleDelete(settlement.id)}
                          disabled={isDeleting}
                          className="flex-shrink-0 p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Delete settlement"
                          title="Delete settlement"
                        >
                          {isDeleting ? (
                            <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
