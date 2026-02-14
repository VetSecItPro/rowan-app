'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, DollarSign, ChevronDown } from 'lucide-react';
import type { Bill, CreateBillInput, BillFrequency } from '@/lib/services/bills-service';
import { logger } from '@/lib/logger';
import { safeValidateCreateBill } from '@/lib/validations/bills';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';
import { Modal } from '@/components/ui/Modal';

interface NewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: CreateBillInput) => Promise<void>;
  editBill?: Bill | null;
  spaceId: string;
}

/** Renders a modal form for creating or editing a project bill. */
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
      setReminderEnabled(true);
      setReminderDays(3);
      setNotes('');
    }
  }, [editBill, isOpen]);

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
      auto_pay: false,
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

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <SecondaryButton
        type="button"
        onClick={onClose}
        feature="projects"
        className="!rounded-full"
      >
        Cancel
      </SecondaryButton>
      <CTAButton
        type="submit"
        form="new-bill-form"
        disabled={isSaving}
        feature="projects"
        icon={<DollarSign className="w-4 h-4" />}
        className="!rounded-full"
      >
        {isSaving ? 'Saving...' : editBill ? 'Update Bill' : 'Create Bill'}
      </CTAButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editBill ? 'Edit Bill' : 'New Bill'}
      maxWidth="4xl"
      headerGradient="bg-gradient-to-r from-amber-500 to-amber-600"
      footer={footerContent}
    >
      <form id="new-bill-form" onSubmit={handleSubmit} className="space-y-6">
            {/* General Error Banner */}
            {generalError && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-200">{generalError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Bill Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Electric Bill, Netflix, Rent"
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.name
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    step="0.01"
                    min="0"
                    max="999999999"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      errors.amount
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                    required
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.due_date
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                  required
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-400">{errors.due_date}</p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <div className="relative">
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                    className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 appearance-none"
                  >
                    {frequencies.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 appearance-none ${
                      errors.category
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-400">{errors.category}</p>
                )}
              </div>

              <div>
                <label htmlFor="payee" className="block text-sm font-medium text-gray-300 mb-2">
                  Payee
                </label>
                <input
                  id="payee"
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="Who to pay"
                  maxLength={255}
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    errors.payee
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                />
                {errors.payee && (
                  <p className="mt-1 text-sm text-red-400">{errors.payee}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  maxLength={1000}
                  className={`w-full px-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none ${
                    errors.notes
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-400">{errors.notes}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-3 pt-4 border-t border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    Enable Reminder
                  </span>
                </label>

                {reminderEnabled && (
                  <div className="ml-8">
                    <label htmlFor="reminderDays" className="block text-sm text-gray-400 mb-2">
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
                      <p className="mt-1 text-sm text-red-400">
                        {errors.reminder_days_before}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

      </form>
    </Modal>
  );
}
