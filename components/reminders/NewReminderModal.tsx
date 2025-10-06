'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateReminderInput, Reminder } from '@/lib/services/reminders-service';

interface NewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: CreateReminderInput) => void;
  editReminder?: Reminder | null;
  spaceId: string;
}

export function NewReminderModal({ isOpen, onClose, onSave, editReminder, spaceId }: NewReminderModalProps) {
  const [formData, setFormData] = useState<CreateReminderInput>({
    space_id: spaceId,
    title: '',
    description: '',
    reminder_type: 'time',
    reminder_time: '',
    location: '',
    priority: 'medium',
    status: 'active',
  });

  // Populate form when editing
  useEffect(() => {
    if (editReminder) {
      setFormData({
        space_id: spaceId,
        title: editReminder.title,
        description: editReminder.description || '',
        reminder_type: editReminder.reminder_type,
        reminder_time: editReminder.reminder_time || '',
        location: editReminder.location || '',
        priority: editReminder.priority || 'medium',
        status: editReminder.status || 'active',
        repeat_pattern: editReminder.repeat_pattern || '',
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        reminder_type: 'time',
        reminder_time: '',
        location: '',
        priority: 'medium',
        status: 'active',
      });
    }
  }, [editReminder, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editReminder ? 'Edit Reminder' : 'Create New Reminder'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter reminder title..."
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Reminder Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reminder Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, reminder_type: 'time' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.reminder_type === 'time'
                    ? 'bg-gradient-reminders text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Time-based
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, reminder_type: 'location' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.reminder_type === 'location'
                    ? 'bg-gradient-reminders text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Location-based
              </button>
            </div>
          </div>

          {/* Time or Location based on type */}
          {formData.reminder_type === 'time' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reminder Time *
              </label>
              <input
                type="datetime-local"
                required={formData.reminder_type === 'time'}
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                required={formData.reminder_type === 'location'}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location..."
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Repeat Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat
              </label>
              <select
                value={formData.repeat_pattern || ''}
                onChange={(e) => setFormData({ ...formData, repeat_pattern: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg"
            >
              {editReminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
