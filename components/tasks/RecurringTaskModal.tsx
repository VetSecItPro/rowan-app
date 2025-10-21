'use client';

import { useState } from 'react';
import { X, Repeat, ChevronDown } from 'lucide-react';
import { taskRecurrenceService, RecurringTaskInput } from '@/lib/services/task-recurrence-service';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';

interface RecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  spaceId: string;
  userId: string;
}

export function RecurringTaskModal({ isOpen, onClose, onSave, spaceId, userId }: RecurringTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    pattern: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: 1,
    daysOfWeek: [] as number[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await taskRecurrenceService.createRecurringTask({
        space_id: spaceId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        created_by: userId,
        recurrence: {
          pattern: formData.pattern,
          interval: formData.interval,
          days_of_week: formData.daysOfWeek,
        },
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating recurring task:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Create Recurring Task</h2>
          </div>
          <button onClick={onClose} className="btn-touch w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active-press hover-lift">
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium mb-2 cursor-pointer">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
            />
          </div>

          <div>
            <label htmlFor="field-2" className="block text-sm font-medium mb-2 cursor-pointer">Pattern</label>
            <div className="relative">
              <select
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value as any })}
                className="w-full px-4 py-2 pr-10 border rounded-lg dark:bg-gray-900 appearance-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="field-3" className="block text-sm font-medium mb-2 cursor-pointer">Every</label>
            <input
              type="number"
              min="1"
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
            />
          </div>

          {formData.pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Days of Week</label>
              <div className="flex gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const days = formData.daysOfWeek.includes(idx)
                        ? formData.daysOfWeek.filter(d => d !== idx)
                        : [...formData.daysOfWeek, idx];
                      setFormData({ ...formData, daysOfWeek: days });
                    }}
                    className={`w-10 h-10 rounded-full transition-colors ${
                      formData.daysOfWeek.includes(idx) ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="tasks"
            >
              Cancel
            </SecondaryButton>
            <CTAButton
              type="submit"
              feature="tasks"
              breathing
              ripple
              icon={<Repeat className="w-4 h-4" />}
            >
              Create Recurring Task
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}
