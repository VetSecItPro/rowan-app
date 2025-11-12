'use client';

import { useState, useEffect } from 'react';
import { X, Smile, ChevronDown, Home } from 'lucide-react';
import { CreateChoreInput } from '@/lib/services/chores-service';
import { Chore } from '@/lib/types';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Chore category configuration with colors and emojis
export const CHORE_CATEGORIES = {
  cleaning: { emoji: '🧹', label: 'Cleaning', color: 'bg-cyan-500', textColor: 'text-cyan-600', lightBg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  laundry: { emoji: '👕', label: 'Laundry', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-100 dark:bg-blue-900/30' },
  dishes: { emoji: '🍽️', label: 'Dishes', color: 'bg-teal-500', textColor: 'text-teal-600', lightBg: 'bg-teal-100 dark:bg-teal-900/30' },
  cooking: { emoji: '🍳', label: 'Cooking', color: 'bg-orange-500', textColor: 'text-orange-600', lightBg: 'bg-orange-100 dark:bg-orange-900/30' },
  yard_work: { emoji: '🌿', label: 'Yard Work', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-100 dark:bg-green-900/30' },
  maintenance: { emoji: '🔧', label: 'Maintenance', color: 'bg-gray-500', textColor: 'text-gray-600', lightBg: 'bg-gray-100 dark:bg-gray-900/30' },
  pet_care: { emoji: '🐾', label: 'Pet Care', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  organizing: { emoji: '📦', label: 'Organizing', color: 'bg-purple-500', textColor: 'text-purple-600', lightBg: 'bg-purple-100 dark:bg-purple-900/30' },
  trash: { emoji: '🗑️', label: 'Trash/Recycling', color: 'bg-emerald-500', textColor: 'text-emerald-600', lightBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  other: { emoji: '🏠', label: 'Other', color: 'bg-indigo-500', textColor: 'text-indigo-600', lightBg: 'bg-indigo-100 dark:bg-indigo-900/30' },
};

interface NewChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chore: CreateChoreInput) => void;
  editChore?: Chore | null;
  spaceId: string;
  userId: string;
}

export function NewChoreModal({ isOpen, onClose, onSave, editChore, spaceId, userId }: NewChoreModalProps) {
  const [formData, setFormData] = useState<CreateChoreInput>({
    space_id: spaceId,
    title: '',
    description: '',
    frequency: 'weekly',
    status: 'pending',
    due_date: '',
    created_by: userId,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
  const [dateError, setDateError] = useState<string>('');

  useEffect(() => {
    if (editChore) {
      setFormData({
        space_id: spaceId,
        title: editChore.title,
        description: editChore.description || '',
        frequency: editChore.frequency,
        status: editChore.status,
        due_date: editChore.due_date || '',
        created_by: userId,
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        frequency: 'weekly',
        status: 'pending',
        due_date: '',
        created_by: userId,
      });
      setCategory('');
    }
    setShowEmojiPicker(false);
    setDateError('');
  }, [editChore, spaceId, isOpen]);

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate due date is not in the past
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        setDateError('Due date is in the past');
        return;
      }
    }

    // Clear any previous errors
    setDateError('');

    // Clean up form data - remove empty strings for optional fields
    const cleanedData: CreateChoreInput = {
      ...formData,
      description: formData.description || undefined,
      due_date: formData.due_date || undefined,
    };

    onSave(cleanedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6" />
              <h2 className="text-lg sm:text-xl font-bold">
                {editChore ? 'Edit Chore' : 'New Chore'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              Chore Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                id="field-1"
              onChange={(e) =>  setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Clean the kitchen"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 z-10 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
                    <h4 className="text-base sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select an emoji</h4>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Click to add emoji"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              id="field-2"
              onChange={(e) =>  setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this chore..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Category & Frequency Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="relative z-50">
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  id="field-3"
              onChange={(e) =>  setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem', position: 'relative', zIndex: 9999 }}
                >
                  <option value="">Select category...</option>
                  <option value="cleaning">🧹 Cleaning</option>
                  <option value="laundry">👕 Laundry</option>
                  <option value="dishes">🍽️ Dishes</option>
                  <option value="cooking">🍳 Cooking</option>
                  <option value="yard_work">🌿 Yard Work</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="pet_care">🐾 Pet Care</option>
                  <option value="organizing">📦 Organizing</option>
                  <option value="trash">🗑️ Trash/Recycling</option>
                  <option value="other">🏠 Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Frequency */}
            <div className="relative z-50">
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Frequency
              </label>
              <div className="relative">
                <select
                  value={formData.frequency}
                  id="field-4"
              onChange={(e) =>  setFormData({ ...formData, frequency: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem', position: 'relative', zIndex: 9999 }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="once">One-time</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>
          </div>

          {/* Day Selection for Weekly and Biweekly */}
          {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Days of Week {formData.frequency === 'biweekly' && '(Every Other Week)'}
              </label>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedDaysOfWeek(prev =>
                        prev.includes(index)
                          ? prev.filter(d => d !== index)
                          : [...prev, index]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDaysOfWeek.includes(index)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {formData.frequency === 'biweekly' && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  This chore will repeat every two weeks on the selected days.
                </p>
              )}
            </div>
          )}

          {/* Day Selection for Monthly */}
          {formData.frequency === 'monthly' && (
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 cursor-pointer">
                Select Days of Month
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDaysOfMonth(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDaysOfMonth.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="relative z-50">
              <label htmlFor="field-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Status
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  id="field-7"
              onChange={(e) =>  setFormData({ ...formData, status: e.target.value as 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed' })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem', position: 'relative', zIndex: 9999 }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="field-8" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                id="field-8"
              onChange={(e) =>  {
                  setFormData({ ...formData, due_date: e.target.value });

                  // Validate on change
                  if (e.target.value) {
                    const dueDate = new Date(e.target.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (dueDate < today) {
                      setDateError('Due date is in the past');
                    } else {
                      setDateError('');
                    }
                  } else {
                    setDateError('');
                  }
                }}
                className={`w-full px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-gray-900 dark:text-white ${
                  dateError ? 'border-red-500 dark:border-red-500' : 'border-gray-200/50 dark:border-gray-700/50'
                }`}
              />
              {dateError && (
                <p className="mt-2 text-base md:text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="font-medium">⚠</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!dateError}
              className={`flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl transition-all shadow-lg font-medium ${
                dateError ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {editChore ? 'Update Chore' : 'Create Chore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
