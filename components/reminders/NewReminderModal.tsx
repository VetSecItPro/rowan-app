'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, Smile } from 'lucide-react';
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
    emoji: '🔔',
    category: 'personal',
    reminder_time: '',
    priority: 'medium',
    status: 'active',
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);
  const [dateError, setDateError] = useState<string>('');

  // Helper function to convert ISO string to datetime-local format
  const formatDatetimeLocal = (isoString: string) => {
    if (!isoString) return '';
    // Convert ISO string to format "yyyy-MM-ddTHH:mm" for datetime-local input
    return isoString.slice(0, 16);
  };

  // Populate form when editing
  useEffect(() => {
    if (editReminder) {
      setFormData({
        space_id: spaceId,
        title: editReminder.title,
        description: editReminder.description || '',
        emoji: editReminder.emoji || '🔔',
        category: editReminder.category || 'personal',
        reminder_time: formatDatetimeLocal(editReminder.reminder_time || ''),
        priority: editReminder.priority || 'medium',
        status: editReminder.status || 'active',
        repeat_pattern: editReminder.repeat_pattern || '',
      });

      // Populate repeat days based on pattern
      if (editReminder.repeat_pattern === 'weekly' && editReminder.repeat_days) {
        setSelectedWeekdays(editReminder.repeat_days);
      } else if (editReminder.repeat_pattern === 'monthly' && editReminder.repeat_days) {
        setSelectedMonthDays(editReminder.repeat_days);
      }
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        emoji: '🔔',
        category: 'personal',
        reminder_time: '',
        priority: 'medium',
        status: 'active',
      });
      setSelectedWeekdays([]);
      setSelectedMonthDays([]);
    }
    setDateError('');
  }, [editReminder, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate reminder time is not in the past
    if (formData.reminder_time) {
      const reminderDate = new Date(formData.reminder_time);
      const now = new Date();

      if (reminderDate < now) {
        setDateError('Reminder time cannot be in the past');
        return;
      }
    }

    // Clear any previous errors
    setDateError('');

    // Prepare data with repeat_days based on pattern
    const submissionData: CreateReminderInput = {
      ...formData,
      // Convert datetime-local format to ISO string for database
      reminder_time: formData.reminder_time ? new Date(formData.reminder_time).toISOString() : undefined,
    };

    // Add repeat_days if applicable
    if (formData.repeat_pattern === 'weekly' && selectedWeekdays.length > 0) {
      submissionData.repeat_days = selectedWeekdays;
    } else if (formData.repeat_pattern === 'monthly' && selectedMonthDays.length > 0) {
      submissionData.repeat_days = selectedMonthDays;
    } else if (formData.repeat_pattern === 'daily') {
      submissionData.repeat_days = [];
    } else if (!formData.repeat_pattern || formData.repeat_pattern === '') {
      submissionData.repeat_days = [];
    }

    onSave(submissionData);
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
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title with Emoji Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reminder Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter reminder title..."
                className="w-full px-4 pr-12 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors z-10"
              >
                <Smile className="w-5 h-5 text-gray-400" />
              </button>

              {/* Custom Emoji Picker */}
              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 w-80">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select an emoji</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {['🔔', '⏰', '📅', '⚡', '💡', '📌', '✅', '🎯', '⭐', '💊', '🏃', '💰', '🏠', '📝', '📧', '☎️', '🎉', '🎂', '❤️', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, emoji });
                            setShowEmojiPicker(false);
                          }}
                          className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { value: 'bills', label: 'Bills', icon: '💰', color: 'bg-green-500' },
                { value: 'health', label: 'Health', icon: '💊', color: 'bg-red-500' },
                { value: 'work', label: 'Work', icon: '💼', color: 'bg-blue-500' },
                { value: 'personal', label: 'Personal', icon: '👤', color: 'bg-purple-500' },
                { value: 'household', label: 'Household', icon: '🏠', color: 'bg-amber-500' },
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: category.value as any })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    formData.category === category.value
                      ? `${category.color} border-transparent text-white shadow-lg`
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{category.icon}</span>
                  <span className="text-xs font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reminder Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reminder Time
            </label>
            <input
              type="datetime-local"
              value={formData.reminder_time || ''}
              onChange={(e) => {
                setFormData({ ...formData, reminder_time: e.target.value });

                // Validate on change
                if (e.target.value) {
                  const reminderDate = new Date(e.target.value);
                  const now = new Date();

                  if (reminderDate < now) {
                    setDateError('Reminder time cannot be in the past');
                  } else {
                    setDateError('');
                  }
                } else {
                  setDateError('');
                }
              }}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white ${
                dateError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {dateError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="font-medium">⚠</span>
                {dateError}
              </p>
            )}
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="relative">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none pr-10"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Repeat Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat
              </label>
              <div className="relative">
                <select
                  value={formData.repeat_pattern || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, repeat_pattern: e.target.value });
                    setSelectedWeekdays([]);
                    setSelectedMonthDays([]);
                  }}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none pr-10"
                >
                  <option value="">Never</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Conditional Weekly Days Selection */}
          {formData.repeat_pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Days
              </label>
              <div className="flex gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedWeekdays(prev =>
                        prev.includes(index)
                          ? prev.filter(d => d !== index)
                          : [...prev, index]
                      );
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedWeekdays.includes(index)
                        ? 'bg-pink-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional Monthly Days Selection */}
          {formData.repeat_pattern === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Days of Month
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedMonthDays(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedMonthDays.includes(day)
                        ? 'bg-pink-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              disabled={!!dateError}
              className={`px-6 py-2 shimmer-bg text-white rounded-lg transition-all shadow-lg ${
                dateError ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {editReminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
