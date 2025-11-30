'use client';

import { useState, useEffect } from 'react';
import { X, Target, Calendar, Zap, ChevronDown, Plus } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';

interface Habit {
  id: string;
  title: string;
  description?: string;
  category?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly';
  frequency_value?: number;
  target_count?: number;
  space_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateHabitInput {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly';
  frequency_value?: number;
  target_count?: number;
}

interface NewHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: CreateHabitInput) => void;
  editHabit?: Habit | null;
  spaceId: string;
}

const categoryOptions = [
  { value: 'health', label: '💪 Health & Fitness', color: 'text-green-600', description: 'Exercise, nutrition, sleep, wellness' },
  { value: 'productivity', label: '⚡ Productivity', color: 'text-blue-600', description: 'Work efficiency, time management' },
  { value: 'learning', label: '📚 Learning & Growth', color: 'text-purple-600', description: 'Skills, education, reading' },
  { value: 'mindfulness', label: '🧘 Mindfulness & Mental Health', color: 'text-indigo-600', description: 'Meditation, self-care, mental wellness' },
  { value: 'social', label: '👥 Social & Relationships', color: 'text-pink-600', description: 'Family time, friends, networking' },
  { value: 'creative', label: '🎨 Creative & Hobbies', color: 'text-orange-600', description: 'Art, music, writing, crafts' },
  { value: 'financial', label: '💰 Financial & Career', color: 'text-emerald-600', description: 'Budgeting, investing, career growth' },
  { value: 'spiritual', label: '✨ Spiritual & Purpose', color: 'text-yellow-600', description: 'Reflection, gratitude, values' },
  { value: 'household', label: '🏠 Home & Organization', color: 'text-cyan-600', description: 'Cleaning, organizing, maintenance' },
  { value: 'environment', label: '🌱 Environment & Sustainability', color: 'text-lime-600', description: 'Eco-friendly choices, nature' },
  { value: 'other', label: '📌 Other', color: 'text-gray-600', description: 'Custom category' },
];

const frequencyOptions = [
  { value: 'daily', label: 'Daily', description: 'Every single day' },
  { value: 'weekdays', label: 'Weekdays', description: 'Monday to Friday' },
  { value: 'weekends', label: 'Weekends', description: 'Saturday and Sunday' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
  { value: 'custom', label: 'Custom Schedule', description: 'Set your own pattern' },
];

export function NewHabitModal({ isOpen, onClose, onSave, editHabit, spaceId }: NewHabitModalProps) {
  const [formData, setFormData] = useState<CreateHabitInput>({
    space_id: spaceId,
    title: '',
    description: '',
    category: '',
    frequency_type: 'daily',
    frequency_value: 1,
    target_count: 1,
  });

  useEffect(() => {
    if (editHabit) {
      setFormData({
        space_id: spaceId,
        title: editHabit.title,
        description: editHabit.description || '',
        category: editHabit.category || '',
        frequency_type: editHabit.frequency_type,
        frequency_value: editHabit.frequency_value || 1,
        target_count: editHabit.target_count || 1,
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        category: '',
        frequency_type: 'daily',
        frequency_value: 1,
        target_count: 1,
      });
    }
  }, [editHabit, spaceId]);

  const handleCategoryChange = (value: string | undefined) => {
    setFormData({ ...formData, category: value || '' });
  };

  const handleFrequencyChange = (value: string | undefined) => {
    if (value && (value === 'daily' || value === 'weekly' || value === 'monthly')) {
      setFormData({ ...formData, frequency_type: value });
    }
  };

  // Helper functions for dropdown options
  const getCategoryOptions = () => {
    return [
      { value: '', label: 'Select category...' },
      ...categoryOptions.map((option) => ({
        value: option.value,
        label: option.label
      }))
    ];
  };

  const getFrequencyOptions = () => {
    return frequencyOptions.map((option) => ({
      value: option.value,
      label: option.label
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCategory = categoryOptions.find(opt => opt.value === formData.category);
  const selectedFrequency = frequencyOptions.find(opt => opt.value === formData.frequency_type);

  return (
    <div className="fixed inset-0 sm:flex sm:items-center sm:justify-center sm:p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container with Glassmorphism */}
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-2xl shadow-2xl flex flex-col overflow-hidden" style={{ zIndex: 10000, maxHeight: '90vh' }}>
        <div className="flex-1 overflow-y-auto overscroll-contain relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-indigo-600/90 backdrop-blur-md border-b border-indigo-200/50 dark:border-indigo-700/50 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editHabit ? 'Edit Habit' : 'Create New Habit'}
              </h2>
              <p className="text-indigo-100 text-sm">Build consistent healthy habits</p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all focus:outline-none focus:ring-4 focus:ring-white/20 sm:focus:ring-2 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="habit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Habit Name *
            </label>
            <input
              id="habit-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Drink 8 glasses of water"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="habit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="habit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes or details about this habit..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="habit-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <Dropdown
              value={formData.category || ''}
              onChange={handleCategoryChange}
              options={getCategoryOptions()}
              placeholder="Select category..."
            />
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="habit-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency *
            </label>
            <Dropdown
              value={formData.frequency_type}
              onChange={handleFrequencyChange}
              options={getFrequencyOptions()}
              placeholder="Select frequency..."
            />
          </div>

          {/* Target Count */}
          <div>
            <label htmlFor="habit-target" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Target
            </label>
            <div className="flex items-center gap-3">
              <input
                id="habit-target"
                type="number"
                min="1"
                max="100"
                value={formData.target_count || 1}
                onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white text-center"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                times per {formData.frequency_type === 'daily' ? 'day' : formData.frequency_type === 'weekly' ? 'week' : 'month'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg font-medium flex items-center gap-2"
            >
              {editHabit ? (
                <>
                  <Target className="w-4 h-4" />
                  Update Habit
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Habit
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}