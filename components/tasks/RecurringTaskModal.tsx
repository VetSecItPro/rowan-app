'use client';

import { useState } from 'react';
import { X, Repeat } from 'lucide-react';
import { taskRecurrenceService, RecurringTaskInput } from '@/lib/services/task-recurrence-service';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Recurring Task</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pattern</label>
            <select
              value={formData.pattern}
              onChange={(e) => setFormData({ ...formData, pattern: e.target.value as any })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Every</label>
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
                    className={`w-10 h-10 rounded-full ${
                      formData.daysOfWeek.includes(idx) ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded-lg">
              Create Recurring Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
