'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/lib/services/expense-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { logger } from '@/lib/logger';

interface RecurringBillsCalendarProps {
  spaceId: string;
}

interface BillOccurrence {
  expense: Expense;
  date: Date;
  isPaid: boolean;
  amount: number;
}

export default function RecurringBillsCalendar({ spaceId }: RecurringBillsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  const [billOccurrences, setBillOccurrences] = useState<BillOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadRecurringExpenses();
  }, [spaceId, currentMonth]);

  const loadRecurringExpenses = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get all recurring expenses for the space
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_recurring', true)
        .order('date', { ascending: true });

      if (error) throw error;

      setRecurringExpenses(data || []);
      generateBillOccurrences(data || []);
    } catch (error) {
      logger.error('Error loading recurring expenses:', error, { component: 'RecurringBillsCalendar', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  const generateBillOccurrences = (expenses: Expense[]) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const occurrences: BillOccurrence[] = [];

    expenses.forEach((expense) => {
      if (!expense.date) return;
      const expenseDate = parseISO(expense.date);
      const dayOfMonth = expenseDate.getDate();

      // Generate occurrences for each day that matches the recurring pattern
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      daysInMonth.forEach((day) => {
        let shouldInclude = false;

        // Handle different recurring frequencies
        switch (expense.recurring_frequency) {
          case 'monthly':
            // If the day of month matches
            if (day.getDate() === dayOfMonth) {
              shouldInclude = true;
            }
            break;

          case 'weekly':
            // If the day of week matches
            if (day.getDay() === expenseDate.getDay()) {
              shouldInclude = true;
            }
            break;

          case 'biweekly':
            // Every 14 days from the start date
            const daysDiff = Math.floor((day.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff % 14 === 0) {
              shouldInclude = true;
            }
            break;

          case 'yearly':
            // If month and day match
            if (day.getMonth() === expenseDate.getMonth() && day.getDate() === dayOfMonth) {
              shouldInclude = true;
            }
            break;

          case 'quarterly':
            // Every 3 months
            const monthsDiff = (day.getFullYear() - expenseDate.getFullYear()) * 12 + day.getMonth() - expenseDate.getMonth();
            if (monthsDiff >= 0 && monthsDiff % 3 === 0 && day.getDate() === dayOfMonth) {
              shouldInclude = true;
            }
            break;
        }

        if (shouldInclude) {
          occurrences.push({
            expense,
            date: day,
            isPaid: false, // TODO: Check if this bill instance has been paid
            amount: expense.amount,
          });
        }
      });
    });

    setBillOccurrences(occurrences);
  };

  const getDayOccurrences = (day: Date) => {
    return billOccurrences.filter((occ) => isSameDay(occ.date, day));
  };

  const getTotalForDay = (day: Date) => {
    const dayOccs = getDayOccurrences(day);
    return dayOccs.reduce((sum, occ) => sum + occ.amount, 0);
  };

  const getMonthTotal = () => {
    return billOccurrences.reduce((sum, occ) => sum + occ.amount, 0);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate calendar grid (start from Sunday)
  const startDay = monthStart.getDay();
  const calendarDays: (Date | null)[] = [
    ...Array(startDay).fill(null),
    ...daysInMonth,
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Recurring Bills Calendar</h2>
          </div>
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
          >
            Today
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Month Total */}
        <div className="mt-4 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <DollarSign className="w-5 h-5" />
          <span className="text-lg font-bold">
            Total this month: ${getMonthTotal().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading calendar...
          </div>
        ) : (
          <>
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayOccs = getDayOccurrences(day);
                const dayTotal = getTotalForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md ${
                      isToday
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : dayOccs.length > 0
                        ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    {/* Day Number */}
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {format(day, 'd')}
                    </div>

                    {/* Bills Count & Total */}
                    {dayOccs.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                            {dayOccs.length} bill{dayOccs.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          ${dayTotal.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              Bills on {format(selectedDate, 'MMMM d, yyyy')}
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {getDayOccurrences(selectedDate).map((occ, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 dark:text-white">
                    {occ.expense.description}
                  </h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {occ.expense.category} • {occ.expense.recurring_frequency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    ${occ.amount.toLocaleString()}
                  </p>
                  {occ.expense.payment_method && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {occ.expense.payment_method}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {getDayOccurrences(selectedDate).length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No bills due on this date
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
