'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  AlertCircle,
  Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  getExpenseSplits,
  settleExpenseSplit,
  createSettlement,
  getSettlements,
  type ExpenseSplit,
  type Settlement,
  type CreateSettlementInput,
} from '@/lib/services/expense-splitting-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface SettlementTrackerProps {
  expenseId: string;
  spaceId: string;
}

export function SettlementTracker({ expenseId, spaceId }: SettlementTrackerProps) {
  const { user } = useAuth();
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSettlement, setShowNewSettlement] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    amount: '',
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Load splits and settlements
  const loadData = async () => {
    try {
      setLoading(true);
      const [splitsData, settlementsData] = await Promise.all([
        getExpenseSplits(expenseId),
        getSettlements(spaceId, 10),
      ]);
      setSplits(splitsData);
      setSettlements(settlementsData.filter(s =>
        s.expense_ids?.includes(expenseId)
      ));
    } catch (err) {
      logger.error('Failed to load settlement data:', err, { component: 'SettlementTracker', action: 'component_action' });
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [expenseId, spaceId]);

  // Handle settlement payment
  const handleSettleAmount = async (splitId: string, amount?: number) => {
    try {
      await settleExpenseSplit(splitId, amount);
      await loadData(); // Refresh data
    } catch (err) {
      logger.error('Failed to settle amount:', err, { component: 'SettlementTracker', action: 'component_action' });
      setError('Failed to process settlement');
    }
  };

  // Handle new settlement creation
  const handleCreateSettlement = async () => {
    if (!user || !newSettlement.amount) return;

    try {
      const settlementData: CreateSettlementInput = {
        space_id: spaceId,
        from_user_id: user.id,
        to_user_id: splits.find(s => s.user_id !== user.id)?.user_id || '',
        amount: parseFloat(newSettlement.amount),
        payment_method: newSettlement.paymentMethod || undefined,
        reference_number: newSettlement.referenceNumber || undefined,
        notes: newSettlement.notes || undefined,
        expense_ids: [expenseId],
        created_by: user.id,
      };

      await createSettlement(settlementData);
      setShowNewSettlement(false);
      setNewSettlement({ amount: '', paymentMethod: '', referenceNumber: '', notes: '' });
      await loadData(); // Refresh data
    } catch (err) {
      logger.error('Failed to create settlement:', err, { component: 'SettlementTracker', action: 'component_action' });
      setError('Failed to create settlement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
        <span className="ml-2 text-gray-400">Loading settlement data...</span>
      </div>
    );
  }

  const hasUnsettledSplits = splits.some(s => s.status !== 'settled');
  const totalOwed = splits.reduce((sum, s) => sum + (s.amount_owed - s.amount_paid), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">
            Settlement Tracking
          </h3>
        </div>
        {hasUnsettledSplits && (
          <button
            onClick={() => setShowNewSettlement(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Split Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {splits.map((split) => (
          <div
            key={split.id}
            className={`p-4 rounded-lg border-2 ${
              split.status === 'settled'
                ? 'border-green-800 bg-green-900/20'
                : split.status === 'partially-paid'
                ? 'border-yellow-800 bg-yellow-900/20'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">
                  {split.is_payer ? 'Paid by you' : 'You owe'}
                </span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                split.status === 'settled'
                  ? 'bg-green-900/30 text-green-300'
                  : split.status === 'partially-paid'
                  ? 'bg-yellow-900/30 text-yellow-300'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {split.status === 'settled' && <CheckCircle className="w-3 h-3" />}
                {split.status === 'partially-paid' && <Clock className="w-3 h-3" />}
                {split.status === 'pending' && <Clock className="w-3 h-3" />}
                {split.status.replace('-', ' ')}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Amount owed:</span>
                <span className="font-semibold text-white">
                  ${split.amount_owed.toFixed(2)}
                </span>
              </div>

              {split.amount_paid > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Amount paid:</span>
                  <span className="font-semibold text-green-400">
                    ${split.amount_paid.toFixed(2)}
                  </span>
                </div>
              )}

              {split.status !== 'settled' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Remaining:</span>
                  <span className="font-semibold text-red-400">
                    ${(split.amount_owed - split.amount_paid).toFixed(2)}
                  </span>
                </div>
              )}

              {split.percentage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Split percentage:</span>
                  <span className="font-medium text-white">
                    {split.percentage}%
                  </span>
                </div>
              )}
            </div>

            {/* Quick Settle Button */}
            {split.status !== 'settled' && !split.is_payer && (
              <button
                onClick={() => handleSettleAmount(split.id)}
                className="w-full mt-3 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                Mark as Paid
              </button>
            )}

            {split.settled_at && (
              <p className="text-xs text-gray-400 mt-2">
                Settled on {format(parseISO(split.settled_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-white">Settlement History</h4>
          <div className="space-y-2">
            {settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-white">
                      ${settlement.amount.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {format(parseISO(settlement.settlement_date), 'MMM d, yyyy')}
                  </span>
                </div>

                {settlement.payment_method && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CreditCard className="w-3 h-3" />
                    {settlement.payment_method}
                    {settlement.reference_number && (
                      <span className="ml-2">#{settlement.reference_number}</span>
                    )}
                  </div>
                )}

                {settlement.notes && (
                  <p className="text-sm text-gray-400 mt-1">
                    {settlement.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Settlement Modal */}
      {showNewSettlement && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setShowNewSettlement(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Record Settlement Payment
                </h3>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={newSettlement.amount}
                      onChange={(e) => setNewSettlement(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={newSettlement.paymentMethod}
                    onChange={(e) => setNewSettlement(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    placeholder="Cash, Venmo, Bank Transfer, etc."
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={newSettlement.referenceNumber}
                    onChange={(e) => setNewSettlement(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Transaction ID, Check #, etc."
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newSettlement.notes}
                    onChange={(e) => setNewSettlement(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
                <button
                  onClick={() => setShowNewSettlement(false)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSettlement}
                  disabled={!newSettlement.amount}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      {hasUnsettledSplits && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-100 mb-2">
            Settlement Summary
          </h4>
          <p className="text-sm text-blue-200">
            Total remaining to settle: <span className="font-semibold">${totalOwed.toFixed(2)}</span>
          </p>
        </div>
      )}
    </div>
  );
}