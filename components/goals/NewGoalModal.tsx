'use client';

import { useState, useEffect } from 'react';
import { X, Smile } from 'lucide-react';
import { CreateGoalInput, Goal } from '@/lib/services/goals-service';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: CreateGoalInput) => void;
  editGoal?: Goal | null;
  spaceId: string;
}

export function NewGoalModal({ isOpen, onClose, onSave, editGoal, spaceId }: NewGoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalInput>({
    space_id: spaceId,
    title: '',
    description: '',
    category: '',
    status: 'active',
    progress: 0,
    target_date: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const categoryOptions = [
    'Financial',
    'Health & Fitness',
    'Career',
    'Education',
    'Personal Development',
    'Other',
  ];

  useEffect(() => {
    if (editGoal) {
      const category = editGoal.category || '';
      const isPresetCategory = categoryOptions.includes(category);

      setFormData({
        space_id: spaceId,
        title: editGoal.title,
        description: editGoal.description || '',
        category: category,
        status: editGoal.status,
        progress: editGoal.progress,
        target_date: editGoal.target_date || '',
      });

      if (isPresetCategory) {
        setSelectedCategory(category);
        setCustomCategory('');
      } else {
        setSelectedCategory('Other');
        setCustomCategory(category);
      }
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        category: '',
        status: 'active',
        progress: 0,
        target_date: '',
      });
      setSelectedCategory('');
      setCustomCategory('');
    }
    setShowEmojiPicker(false);
  }, [editGoal, spaceId, isOpen]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value !== 'Other') {
      setCustomCategory('');
      setFormData({ ...formData, category: value });
    }
  };

  const handleCustomCategoryChange = (value: string) => {
    setCustomCategory(value);
    setFormData({ ...formData, category: value });
  };

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom category if "Other" is selected, otherwise use selected category
    const finalCategory = selectedCategory === 'Other' ? customCategory : selectedCategory;

    // Clean up the form data - don't send empty strings for dates
    const cleanedData: CreateGoalInput = {
      ...formData,
      category: finalCategory,
      target_date: formData.target_date || undefined,
    };

    onSave(cleanedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{editGoal ? 'Edit Goal' : 'New Goal'}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Save for dream vacation"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  aria-label="Add emoji to title"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 grid grid-cols-5 gap-2 z-10 min-w-[240px]">
                    {EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl transition-all hover:scale-110"
                        title="Click to add emoji"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              placeholder="Add details about this goal..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
          {/* Category & Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">Select a category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {/* Custom Category */}
          {selectedCategory === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Category Name *
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => handleCustomCategoryChange(e.target.value)}
                placeholder="Enter custom category name"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Date
            </label>
            <input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg font-medium"
            >
              {editGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
