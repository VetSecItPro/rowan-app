'use client';

import { useState, useEffect } from 'react';
import { X, Smile, Sparkles } from 'lucide-react';
import { CreateReminderInput, Reminder } from '@/lib/services/reminders-service';
import { UserPicker } from './UserPicker';
import { TemplatePicker } from './TemplatePicker';
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentList } from './AttachmentList';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Dropdown } from '@/components/ui/Dropdown';

// Helper functions for dropdown options
const getPriorityOptions = () => [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const getRepeatOptions = () => [
  { value: '', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

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
    assigned_to: undefined,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);
  const [dateError, setDateError] = useState<string>('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [attachmentRefreshTrigger, setAttachmentRefreshTrigger] = useState(0);


  // Reset form when modal opens or when switching between edit/create modes
  useEffect(() => {
    // Only reset when modal is opened
    if (!isOpen) return;

    if (editReminder) {
      // Editing existing reminder - populate with existing data
      setFormData({
        space_id: spaceId,
        title: editReminder.title,
        description: editReminder.description || '',
        emoji: editReminder.emoji || '🔔',
        category: editReminder.category || 'personal',
        reminder_time: editReminder.reminder_time || '',
        priority: editReminder.priority || 'medium',
        status: editReminder.status || 'active',
        repeat_pattern: editReminder.repeat_pattern || '',
        assigned_to: editReminder.assigned_to || undefined,
      });

      // Populate repeat days based on pattern
      if (editReminder.repeat_pattern === 'weekly' && editReminder.repeat_days) {
        setSelectedWeekdays(editReminder.repeat_days);
      } else if (editReminder.repeat_pattern === 'monthly' && editReminder.repeat_days) {
        setSelectedMonthDays(editReminder.repeat_days);
      }
    } else {
      // Creating new reminder - reset to clean state
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        emoji: '🔔',
        category: 'personal',
        reminder_time: '',
        priority: 'medium',
        status: 'active',
        assigned_to: undefined,
      });
      setSelectedWeekdays([]);
      setSelectedMonthDays([]);
    }

    // Reset other form state
    setDateError('');
    setShowEmojiPicker(false);
    setShowTemplatePicker(false);
    setAttachmentRefreshTrigger(prev => prev + 1);
  }, [isOpen, editReminder, spaceId]);

  const handleSelectTemplate = (reminderData: Partial<CreateReminderInput>) => {
    // Populate form with template data
    setFormData({
      ...formData,
      title: reminderData.title || formData.title,
      description: reminderData.description || formData.description,
      emoji: reminderData.emoji || formData.emoji,
      category: (reminderData.category as any) || formData.category,
      priority: (reminderData.priority as any) || formData.priority,
      reminder_time: reminderData.reminder_time || formData.reminder_time,
      repeat_pattern: reminderData.repeat_pattern || formData.repeat_pattern,
    });

    // Set repeat days if provided
    if (reminderData.repeat_days) {
      if (reminderData.repeat_pattern === 'weekly') {
        setSelectedWeekdays(reminderData.repeat_days);
      } else if (reminderData.repeat_pattern === 'monthly') {
        setSelectedMonthDays(reminderData.repeat_days);
      }
    }

    // Close template picker
    setShowTemplatePicker(false);
  };

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
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:rounded-xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-reminders flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 sm:rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {editReminder ? 'Edit Reminder' : showTemplatePicker ? 'Choose Template' : 'New Reminder'}
          </h2>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        {/* Template Picker or Form */}
        {showTemplatePicker ? (
          <TemplatePicker
            spaceId={spaceId}
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplatePicker(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Start with Template */}
          {!editReminder && (
            <button
              type="button"
              onClick={() => setShowTemplatePicker(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-800/50 rounded-xl text-pink-400 hover:from-pink-900/30 hover:to-purple-900/30 transition-all text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Start from a template
            </button>
          )}

          {/* Title with Emoji Picker */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Reminder Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                id="field-1"
              onChange={(e) =>  setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter reminder title..."
                className="w-full px-4 pr-12 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-white"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors z-10"
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
                  <div className="absolute right-0 mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
                    <h4 className="text-base sm:text-sm font-medium text-gray-300 mb-3">Select an emoji</h4>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {['🔔', '⏰', '📅', '⚡', '💡', '📌', '✅', '🎯', '⭐', '💊', '🏃', '💰', '🏠', '📝', '📧', '☎️', '🎉', '🎂', '❤️', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, emoji });
                            setShowEmojiPicker(false);
                          }}
                          className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
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
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              id="field-2"
              onChange={(e) =>  setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description..."
              rows={2}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-white resize-none overflow-y-auto max-h-24"
            />
          </div>

          {/* Attachments (only when editing) */}
          {editReminder && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attachments
                </label>
                <AttachmentList
                  reminderId={editReminder.id}
                  refreshTrigger={attachmentRefreshTrigger}
                />
              </div>
              <AttachmentUploader
                reminderId={editReminder.id}
                onUploadComplete={() => setAttachmentRefreshTrigger(prev => prev + 1)}
              />
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Category
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { value: 'bills', label: 'Bills', icon: '💰', color: 'bg-green-500', hoverBg: 'hover:bg-green-900/30' },
                { value: 'health', label: 'Health', icon: '💊', color: 'bg-red-500', hoverBg: 'hover:bg-red-900/30' },
                { value: 'work', label: 'Work', icon: '💼', color: 'bg-blue-500', hoverBg: 'hover:bg-blue-900/30' },
                { value: 'personal', label: 'Me', icon: '👤', color: 'bg-purple-500', hoverBg: 'hover:bg-purple-900/30' },
                { value: 'household', label: 'Home', icon: '🏠', color: 'bg-amber-500', hoverBg: 'hover:bg-amber-900/30' },
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: category.value as any })}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all font-medium text-xs ${
                    formData.category === category.value
                      ? `${category.color} text-white shadow-md`
                      : `bg-gray-700 text-gray-300 ${category.hoverBg}`
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Assignment */}
          <UserPicker
            spaceId={spaceId}
            selectedUserId={formData.assigned_to}
            onSelect={(userId) => setFormData({ ...formData, assigned_to: userId || undefined })}
          />

          {/* Reminder Time */}
          <div>
            <DateTimePicker
              value={formData.reminder_time || ''}
              onChange={(value) => {
                setFormData({ ...formData, reminder_time: value });

                // Validate on change
                if (value) {
                  const reminderDate = new Date(value);
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
              label="Reminder Time"
              placeholder="Click to select date and time..."
            />
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <Dropdown
                value={formData.priority || 'medium'}
                onChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' | 'urgent' })}
                options={getPriorityOptions()}
                placeholder="Select priority..."
              />
            </div>

            {/* Repeat Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Repeat
              </label>
              <Dropdown
                value={formData.repeat_pattern || ''}
                onChange={(value) => {
                  setFormData({ ...formData, repeat_pattern: value });
                  setSelectedWeekdays([]);
                  setSelectedMonthDays([]);
                }}
                options={getRepeatOptions()}
                placeholder="Select repeat pattern..."
              />
            </div>
          </div>

          {/* Conditional Weekly Days Selection */}
          {formData.repeat_pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Days
              </label>
              <div className="flex flex-wrap gap-2">
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
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedWeekdays.includes(index)
                        ? 'bg-pink-500 text-white shadow-md'
                        : 'bg-gray-700 text-gray-300 hover:bg-pink-900/30'
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
              <label className="block text-sm font-medium text-gray-300 mb-3">
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
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                      selectedMonthDays.includes(day)
                        ? 'bg-pink-500 text-white shadow-md'
                        : 'bg-gray-700 text-gray-300 hover:bg-pink-900/30'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!dateError}
              className={`px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full transition-all shadow-lg shadow-pink-500/25 font-medium ${
                dateError ? 'opacity-50 cursor-not-allowed' : 'hover:from-pink-600 hover:to-pink-700 hover:shadow-xl hover:shadow-pink-500/30'
              }`}
            >
              {editReminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
