'use client';

import { useState } from 'react';
import {
  Calendar,
  DollarSign,
  MoreVertical,
  Check,
  AlertCircle,
  Clock,
  Repeat,
  CreditCard,
  Edit,
  Trash2,
} from 'lucide-react';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import type { Bill } from '@/lib/services/bills-service';

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
  onMarkPaid: (billId: string) => void;
}

export function BillCard({ bill, onEdit, onDelete, onMarkPaid }: BillCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const dueDate = parseISO(bill.due_date);
  const isOverdue = bill.status === 'overdue';
  const isPaid = bill.status === 'paid';
  const daysUntilDue = differenceInDays(dueDate, new Date());

  // Determine status color and icon
  const getStatusConfig = () => {
    if (isPaid) {
      return {
        bg: 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20',
        border: 'border-green-200 dark:border-green-700',
        statusBadge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
        icon: Check,
        iconColor: 'text-green-600 dark:text-green-400',
        label: 'Paid',
      };
    }

    if (isOverdue) {
      return {
        bg: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30',
        border: 'border-red-300 dark:border-red-700',
        statusBadge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
        icon: AlertCircle,
        iconColor: 'text-red-600 dark:text-red-400',
        label: 'Overdue',
      };
    }

    if (daysUntilDue <= 7) {
      return {
        bg: 'from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-800/20',
        border: 'border-yellow-200 dark:border-yellow-700',
        statusBadge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
        icon: Clock,
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        label: `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} left`,
      };
    }

    return {
      bg: 'from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20',
      border: 'border-blue-200 dark:border-blue-700',
      statusBadge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      icon: Calendar,
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Scheduled',
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Frequency display mapping
  const frequencyLabel: Record<string, string> = {
    'one-time': 'One Time',
    'weekly': 'Weekly',
    'bi-weekly': 'Bi-Weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'semi-annual': 'Semi-Annual',
    'annual': 'Annual',
  };

  return (
    <div className={`relative group bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {bill.name}
          </h3>
          {bill.payee && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay to: {bill.payee}
            </p>
          )}
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn-touch w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Bill options"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                {!isPaid && (
                  <button
                    onClick={() => {
                      onMarkPaid(bill.id);
                      setShowMenu(false);
                    }}
                    className="btn-touch w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark as Paid
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(bill);
                    setShowMenu(false);
                  }}
                  className="btn-touch w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(bill.id);
                    setShowMenu(false);
                  }}
                  className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-baseline gap-2 mb-4">
        <DollarSign className={`w-6 h-6 ${config.iconColor}`} />
        <span className={`text-3xl font-bold ${config.iconColor}`}>
          {bill.amount.toFixed(2)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Calendar className={`w-4 h-4 ${config.iconColor}`} />
          <span className="font-medium">Due:</span>
          <span>{format(dueDate, 'MMM d, yyyy')}</span>
        </div>

        {/* Frequency */}
        {bill.frequency !== 'one-time' && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Repeat className={`w-4 h-4 ${config.iconColor}`} />
            <span className="font-medium">Frequency:</span>
            <span>{frequencyLabel[bill.frequency]}</span>
          </div>
        )}

        {/* Category */}
        {bill.category && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Category:</span>
            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
              {bill.category}
            </span>
          </div>
        )}

        {/* Auto Pay */}
        {bill.auto_pay && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <CreditCard className={`w-4 h-4 ${config.iconColor}`} />
            <span className="font-medium">Auto Pay</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-gray-600">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.statusBadge}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>

        {/* Last Paid */}
        {bill.last_paid_date && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last paid: {format(parseISO(bill.last_paid_date), 'MMM d')}
          </span>
        )}
      </div>

      {/* Notes (if any) */}
      {bill.notes && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 italic border-t border-gray-300 dark:border-gray-600 pt-3">
          {bill.notes}
        </p>
      )}
    </div>
  );
}
