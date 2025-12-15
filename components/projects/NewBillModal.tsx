'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, DollarSign } from 'lucide-react';
import type { Bill, CreateBillInput, BillFrequency } from '@/lib/services/bills-service';
import { logger } from '@/lib/logger';
import {
  createBillSchema,
  updateBillSchema,
  safeValidateCreateBill,
} from '@/lib/validations/bills';
import type { ZodError } from 'zod';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    // Clear errors when modal state changes
    setErrors({});
    setGeneralError(null);

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

    // Clear previous errors
    setErrors({});
    setGeneralError(null);

    // Prepare data for validation
    const billData = {
      space_id: spaceId,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      category: category.trim() || undefined,
      payee: payee.trim() || undefined,
      due_date: dueDate,
      frequency,
      auto_pay: autoPay,
      reminder_enabled: reminderEnabled,
      reminder_days_before: reminderDays,
      notes: notes.trim() || undefined,
    };

    // Validate with Zod (security-first validation)
    const validation = safeValidateCreateBill(billData);

    if (!validation.success) {
      // Extract and display validation errors
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      setGeneralError('Please fix the errors below before submitting.');
      return;
    }

    setIsSaving(true);
    try {
      // Data is now validated and sanitized by Zod
      await onSave(validation.data);
      onClose();
    } catch (error) {
      logger.error('Failed to save bill:', error, { component: 'NewBillModal', action: 'component_action' });
      setGeneralError('Failed to save bill. Please try again.');
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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="flex items-center justify-between p-6 sticky top-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-2xl z-10">
            <h2 className="text-xl font-semibold text-white">
              {editBill ? 'Edit Bill' : 'New Bill'}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* General Error Banner */}
            {generalError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{generalError}</p>
                </div>
              </div>
            )}

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
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.name
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
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
                    max="999999999"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.amount
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
                )}
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
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.due_date
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
                )}
              </div>

              <div className="relative z-50">
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent relative z-50"
                  style={{ position: 'relative', zIndex: 9999 }}
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative z-50">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent relative z-50 ${
                    errors.category
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ position: 'relative', zIndex: 9999 }}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                )}
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
                  maxLength={255}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.payee
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.payee && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.payee}</p>
                )}
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
                  maxLength={1000}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none ${
                    errors.notes
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes}</p>
                )}
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
                      min="0"
                      max="30"
                      value={reminderDays}
                      onChange={(e) => setReminderDays(parseInt(e.target.value))}
                      className="w-full"
                    />
                    {errors.reminder_days_before && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.reminder_days_before}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <SecondaryButton
                type="button"
                onClick={onClose}
                feature="projects"
              >
                Cancel
              </SecondaryButton>
              <CTAButton
                type="submit"
                disabled={isSaving}
                feature="projects"
                icon={<DollarSign className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : editBill ? 'Update Bill' : 'Create Bill'}
              </CTAButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
