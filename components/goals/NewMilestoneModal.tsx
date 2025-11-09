'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Percent, Hash, Calendar, Smile, Target } from 'lucide-react';
import { Milestone, CreateMilestoneInput, Goal } from '@/lib/services/goals-service';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

interface NewMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMilestoneInput) => void;
  editMilestone: Milestone | null;
  goalId: string;
  availableGoals?: Goal[]; // Goals that can be selected as dependencies
}

export function NewMilestoneModal({ isOpen, onClose, onSave, editMilestone, goalId, availableGoals = [] }: NewMilestoneModalProps) {
  const [formData, setFormData] = useState<CreateMilestoneInput>({
    goal_id: goalId,
    title: '',
    description: '',
    type: 'percentage',
    target_value: 0,
    current_value: 0,
    target_date: '',
    depends_on_goal_id: '',
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (editMilestone) {
      setFormData({
        goal_id: editMilestone.goal_id,
        title: editMilestone.title,
        description: editMilestone.description || '',
        type: editMilestone.type,
        target_value: editMilestone.target_value,
        current_value: editMilestone.current_value,
        target_date: editMilestone.target_date || '',
        depends_on_goal_id: '', // For editing, we don't show existing dependencies
      });
    } else {
      setFormData({
        goal_id: goalId,
        title: '',
        description: '',
        type: 'percentage',
        target_value: 0,
        current_value: 0,
        target_date: '',
        depends_on_goal_id: '',
      });
    }
    setShowEmojiPicker(false);
  }, [editMilestone, goalId, isOpen]);

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up the form data - don't send empty strings for dates or dependencies
    const cleanedData: CreateMilestoneInput = {
      ...formData,
      target_date: formData.target_date || undefined,
      depends_on_goal_id: formData.depends_on_goal_id || undefined,
    };

    // For non-date types, remove target_date entirely
    if (formData.type !== 'date') {
      delete cleanedData.target_date;
    }

    onSave(cleanedData);
    onClose();
  };

  if (!isOpen) return null;

  const typeOptions = [
    { value: 'percentage', label: 'Percentage', icon: Percent, desc: 'Track progress as %' },
    { value: 'money', label: 'Money', icon: DollarSign, desc: 'Track financial goals' },
    { value: 'count', label: 'Count', icon: Hash, desc: 'Track countable items' },
    { value: 'date', label: 'Date', icon: Calendar, desc: 'Track by deadline' },
  ];

  const showValueInputs = formData.type !== 'date';

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">{editMilestone ? 'Edit Milestone' : 'New Milestone'}</h2>
            <button
              onClick={onClose}
              className="p-2 flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Save $5,000 for vacation"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this milestone..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Milestone Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: option.value as any })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === option.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.type === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{option.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value Inputs */}
          {showValueInputs && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Target {formData.type === 'percentage' ? 'Percentage' : formData.type === 'money' ? 'Amount' : 'Count'} *
                </label>
                <input
                  type="number"
                  required={showValueInputs}
                  min="0"
                  step={formData.type === 'money' ? '0.01' : '1'}
                  value={formData.target_value || ''}
                  onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
                  placeholder={formData.type === 'percentage' ? '100' : formData.type === 'money' ? '10000' : '20'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="field-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Current Progress
                </label>
                <input
                  type="number"
                  min="0"
                  step={formData.type === 'money' ? '0.01' : '1'}
                  value={formData.current_value || ''}
                  onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Date Input */}
          {formData.type === 'date' && (
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Target Date *
              </label>
              <input
                type="date"
                required={formData.type === 'date'}
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Depends On */}
          {availableGoals.length > 0 && (
            <div>
              <label htmlFor="field-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Depends on Goal (optional)
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={formData.depends_on_goal_id}
                  onChange={(e) => setFormData({ ...formData, depends_on_goal_id: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none"
                >
                  <option value="">No dependency (can start immediately)</option>
                  {availableGoals
                    .filter(goal => goal.id !== goalId) // Don't show the parent goal
                    .map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This milestone will be available after the selected goal is completed
              </p>
            </div>
          )}

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
              {editMilestone ? 'Update Milestone' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
