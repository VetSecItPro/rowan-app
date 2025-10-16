'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { billCalendarService, type UpcomingBill } from '@/lib/services/bill-calendar-service';
import { formatDistanceToNow } from 'date-fns';

interface UpcomingBillsWidgetProps {
  spaceId: string;
  daysAhead?: number;
  showOverdue?: boolean;
}

export default function UpcomingBillsWidget({
  spaceId,
  daysAhead = 30,
  showOverdue = true,
}: UpcomingBillsWidgetProps) {
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
  const [overdueBills, setOverdueBills] = useState<UpcomingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadBills();

    // Subscribe to real-time updates
    const channel = billCalendarService.subscribeToUpcomingBills(spaceId, (newBill) => {
      setUpcomingBills((prev) => [newBill, ...prev].sort((a, b) => a.days_until_due - b.days_until_due));
    });

    return () => {
      const supabase = require('@/lib/supabase/client').createClient();
      supabase.removeChannel(channel);
    };
  }, [spaceId, daysAhead]);

  const loadBills = async () => {
    try {
      setLoading(true);

      const [upcoming, overdue, totals] = await Promise.all([
        billCalendarService.getUpcomingBills(spaceId, daysAhead),
        showOverdue ? billCalendarService.getOverdueBills(spaceId) : Promise.resolve([]),
        billCalendarService.getTotalBillsUpcoming(spaceId, daysAhead),
      ]);

      setUpcomingBills(upcoming);
      setOverdueBills(overdue);
      setTotalAmount(totals.totalAmount);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (daysUntilDue <= 3) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    if (daysUntilDue <= 7) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  };

  const getUrgencyIcon = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return <AlertCircle className="w-4 h-4" />;
    if (daysUntilDue <= 3) return <Clock className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  const handleMarkAsPaid = async (expenseId: string) => {
    try {
      await billCalendarService.markBillAsPaid(expenseId);
      // Reload bills to reflect the change
      await loadBills();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upcoming Bills</h2>
              <p className="text-white/80 text-sm">Next {daysAhead} days</p>
            </div>
          </div>

          {/* Total Amount */}
          <div className="text-right">
            <p className="text-white/80 text-sm">Total Due</p>
            <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/80 text-xs mb-1">This Week</p>
            <p className="text-xl font-bold">
              {upcomingBills.filter((b) => b.days_until_due <= 7).length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/80 text-xs mb-1">Overdue</p>
            <p className="text-xl font-bold">{overdueBills.length}</p>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading bills...
          </div>
        ) : (
          <div className="space-y-3">
            {/* Overdue Bills */}
            {showOverdue && overdueBills.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Overdue Bills
                </h3>
                {overdueBills.map((bill) => (
                  <div
                    key={bill.event_id}
                    className="flex items-start justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 mb-2"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {bill.title.replace('💰 Bill Due: ', '')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {bill.category} • {bill.payment_method || 'No payment method'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getUrgencyColor(bill.days_until_due)}`}>
                          {Math.abs(bill.days_until_due)} {Math.abs(bill.days_until_due) === 1 ? 'day' : 'days'} overdue
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        ${bill.amount.toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleMarkAsPaid(bill.expense_id)}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Mark as Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Bills */}
            {upcomingBills.length > 0 ? (
              upcomingBills.map((bill) => (
                <div
                  key={bill.event_id}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {bill.title.replace('💰 Bill Due: ', '')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {bill.category} • {bill.payment_method || 'No payment method'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${getUrgencyColor(bill.days_until_due)}`}
                      >
                        {getUrgencyIcon(bill.days_until_due)}
                        {bill.days_until_due === 0
                          ? 'Due today'
                          : bill.days_until_due === 1
                          ? 'Due tomorrow'
                          : `Due in ${bill.days_until_due} days`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${bill.amount.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleMarkAsPaid(bill.expense_id)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ml-auto"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark as Paid
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No bills due in the next {daysAhead} days
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
