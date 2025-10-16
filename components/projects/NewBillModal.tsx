'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Bill, CreateBillInput, BillFrequency } from '@/lib/services/bills-service';

interface NewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: CreateBillInput) => Promise<void>;
  editBill?: Bill | null;
  spaceId: string;
}

export function NewBillModal({
  isOpen,
  onClose,
  onSave,
  editBill,
  spaceId,
}: NewBillModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [autoPay, setAutoPay] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editBill) {
      setName(editBill.name);
      setAmount(editBill.amount.toString());
      setCategory(editBill.category || '');
      setPayee(editBill.payee || '');
      setDueDate(editBill.due_date);
      setFrequency(editBill.frequency);
      setAutoPay(editBill.auto_pay);
      setReminderEnabled(editBill.reminder_enabled);
      setReminderDays(editBill.reminder_days_before);
      setNotes(editBill.notes || '');
    } else {
      // Reset form
      setName('');
      setAmount('');
      setCategory('');
      setPayee('');
      setDueDate('');
      setFrequency('monthly');
      setAutoPay(false);
      setReminderEnabled(true);
      setReminderDays(3);
      setNotes('');
    }
  }, [editBill, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !amount || !dueDate) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        space_id: spaceId,
        name: name.trim(),
        amount: parseFloat(amount),
        category: category.trim() || undefined,
        payee: payee.trim() || undefined,
        due_date: dueDate,
        frequency,
        auto_pay: autoPay,
        reminder_enabled: reminderEnabled,
        reminder_days_before: reminderDays,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to save bill:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['Utilities', 'Rent/Mortgage', 'Insurance', 'Subscriptions', 'Credit Card', 'Loan Payment', 'Other'];
  const frequencies: { value: BillFrequency; label: string }[] = [
    { value: 'one-time', label: 'One Time' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi-annual', label: 'Semi-Annual' },
    { value: 'annual', label: 'Annual' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editBill ? 'Edit Bill' : 'New Bill'}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bill Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Electric Bill, Netflix, Rent"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="payee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payee
                </label>
                <input
                  id="payee"
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="Who to pay"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="md:col-span-2 space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPay}
                    onChange={(e) => setAutoPay(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto Pay Enabled
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Reminder
                  </span>
                </label>

                {reminderEnabled && (
                  <div className="ml-8">
                    <label htmlFor="reminderDays" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Remind me {reminderDays} day{reminderDays !== 1 ? 's' : ''} before
                    </label>
                    <input
                      id="reminderDays"
                      type="range"
                      min="1"
                      max="14"
                      value={reminderDays}
                      onChange={(e) => setReminderDays(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 shimmer-projects text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : editBill ? 'Update Bill' : 'Create Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
