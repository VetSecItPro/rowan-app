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
  Edit,
  Trash2,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { Bill } from '@/lib/services/bills-service';

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
  onMarkPaid: (billId: string) => void;
}

/** Renders a bill card with amount, due date, and payment status. */
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
        bg: 'from-green-900/20 to-emerald-800/20',
        border: 'border-green-700',
        statusBadge: 'bg-green-900/30 text-green-300 border-green-700',
        icon: Check,
        iconColor: 'text-green-400',
        label: 'Paid',
      };
    }

    if (isOverdue) {
      return {
        bg: 'from-red-900/30 to-red-800/30',
        border: 'border-red-700',
        statusBadge: 'bg-red-900/30 text-red-300 border-red-700',
        icon: AlertCircle,
        iconColor: 'text-red-400',
        label: 'Overdue',
      };
    }

    if (daysUntilDue <= 7) {
      return {
        bg: 'from-yellow-900/20 to-orange-800/20',
        border: 'border-yellow-700',
        statusBadge: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
        icon: Clock,
        iconColor: 'text-yellow-400',
        label: `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} left`,
      };
    }

    return {
      bg: 'from-blue-900/20 to-indigo-800/20',
      border: 'border-blue-700',
      statusBadge: 'bg-blue-900/30 text-blue-300 border-blue-700',
      icon: Calendar,
      iconColor: 'text-blue-400',
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
          <h3 className="text-lg font-bold text-white mb-1">
            {bill.name}
          </h3>
          {bill.payee && (
            <p className="text-sm text-gray-400">
              Pay to: {bill.payee}
            </p>
          )}
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Bill options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(bill);
                    setShowMenu(false);
                  }}
                  className="btn-touch w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-t-lg flex items-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(bill.id);
                    setShowMenu(false);
                  }}
                  className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-900/20 rounded-b-lg flex items-center gap-2 transition-colors"
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
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Calendar className={`w-4 h-4 ${config.iconColor}`} />
          <span className="font-medium">Due:</span>
          <span>{format(dueDate, 'MMM d, yyyy')}</span>
        </div>

        {/* Frequency */}
        {bill.frequency !== 'one-time' && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Repeat className={`w-4 h-4 ${config.iconColor}`} />
            <span className="font-medium">Frequency:</span>
            <span>{frequencyLabel[bill.frequency]}</span>
          </div>
        )}

        {/* Category */}
        {bill.category && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="font-medium">Category:</span>
            <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">
              {bill.category}
            </span>
          </div>
        )}

      </div>

      {/* Status Badge & Pay Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-600">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.statusBadge}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>

        {/* Mark as Paid Button or Last Paid */}
        {!isPaid ? (
          <button
            onClick={() => onMarkPaid(bill.id)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-full transition-all shadow-lg shadow-green-500/25 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Mark As Paid
          </button>
        ) : bill.last_paid_date ? (
          <span className="text-xs text-gray-400">
            Last paid: {format(parseISO(bill.last_paid_date), 'MMM d')}
          </span>
        ) : null}
      </div>

      {/* Notes (if any) */}
      {bill.notes && (
        <p className="mt-3 text-xs text-gray-400 italic border-t border-gray-600 pt-3">
          {bill.notes}
        </p>
      )}
    </div>
  );
}
