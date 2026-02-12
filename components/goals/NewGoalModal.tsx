'use client';

import { useState, useEffect } from 'react';
import { Smile, Target } from 'lucide-react';
import { CreateGoalInput, Goal, GoalTemplate } from '@/lib/services/goals-service';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

interface SpaceMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: CreateGoalInput) => void;
  editGoal?: Goal | null;
  spaceId: string;
  availableGoals?: Goal[]; // Goals that can be selected as dependencies
  selectedTemplate?: GoalTemplate | null;
  spaceMembers?: SpaceMember[];
}

const CATEGORY_OPTIONS = [
  { value: '💰 Financial', label: '💰 Financial' },
  { value: '💪 Health & Fitness', label: '💪 Health & Fitness' },
  { value: '💼 Career', label: '💼 Career' },
  { value: '📚 Education', label: '📚 Education' },
  { value: '🌱 Personal Development', label: '🌱 Personal Development' },
  { value: '📌 Other', label: '📌 Other' },
];

export function NewGoalModal({ isOpen, onClose, onSave, editGoal, spaceId, availableGoals = [], selectedTemplate, spaceMembers = [] }: NewGoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalInput>({
    space_id: spaceId,
    title: '',
    description: '',
    category: '',
    status: 'active',
    progress: 0,
    target_date: '',
    depends_on_goal_id: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editGoal) {
      const category = editGoal.category || '';
      const isPresetCategory = CATEGORY_OPTIONS.some(option => option.value === category);

      setFormData({
        space_id: spaceId,
        title: editGoal.title,
        description: editGoal.description || '',
        category: category,
        status: editGoal.status,
        progress: editGoal.progress,
        target_date: editGoal.target_date || '',
        depends_on_goal_id: '', // For editing, we don't show existing dependencies
      });

      if (isPresetCategory) {
        setSelectedCategory(category);
        setCustomCategory('');
      } else {
        setSelectedCategory('📌 Other');
        setCustomCategory(category);
      }
    } else if (selectedTemplate) {
      // Prefill from template
      const templateCategory = selectedTemplate.category || '';
      const isPresetCategory = CATEGORY_OPTIONS.some(option => option.value === templateCategory);

      // Calculate target date if template has target_days
      const targetDate = selectedTemplate.target_days
        ? new Date(Date.now() + selectedTemplate.target_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '';

      setFormData({
        space_id: spaceId,
        title: selectedTemplate.title,
        description: selectedTemplate.description || '',
        category: templateCategory,
        status: 'active',
        progress: 0,
        target_date: targetDate,
        depends_on_goal_id: '',
      });

      if (isPresetCategory) {
        setSelectedCategory(templateCategory);
        setCustomCategory('');
      } else {
        setSelectedCategory('📌 Other');
        setCustomCategory(templateCategory);
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
        depends_on_goal_id: '',
      });
      setSelectedCategory('');
      setCustomCategory('');
    }
    setShowEmojiPicker(false);
  }, [editGoal, selectedTemplate, spaceId, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value !== '📌 Other') {
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

  // Helper function for dependency dropdown options
  const getDependencyOptions = () => {
    const options = [{ value: '', label: 'No dependency (can start immediately)' }];
    availableGoals
      .filter(goal => goal.id !== editGoal?.id) // Don't show the goal being edited
      .forEach((goal) => {
        options.push({
          value: goal.id,
          label: goal.title
        });
      });
    return options;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom category if "Other" is selected, otherwise use selected category
    const finalCategory = selectedCategory === '📌 Other' ? customCategory : selectedCategory;

    // Clean up the form data - don't send empty strings for dates or dependencies
    const cleanedData: CreateGoalInput = {
      ...formData,
      category: finalCategory,
      target_date: formData.target_date || undefined,
      depends_on_goal_id: formData.depends_on_goal_id || undefined,
    };

    onSave(cleanedData);
    onClose();
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-goal-form"
        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-full transition-all shadow-lg shadow-indigo-500/25 font-medium"
      >
        {editGoal ? 'Update Goal' : 'Create Goal'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editGoal ? 'Edit Goal' : selectedTemplate ? 'Create Goal from Template' : 'Create New Goal'}
      maxWidth="xl"
      headerGradient="bg-gradient-to-r from-indigo-500 to-indigo-600"
      footer={footerContent}
    >
      <form id="new-goal-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Save for dream vacation"
                className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  aria-label="Add emoji to title"
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-80 max-w-[calc(100vw-4rem)] z-[70]" style={{ transform: 'translateX(-50%)', right: '50%' }}>
                    <h4 className="text-base sm:text-sm font-medium text-gray-300 mb-3">Select an emoji</h4>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
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
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this goal..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
            />
          </div>
          {/* Category & Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Category
              </label>
              <Dropdown
                value={selectedCategory}
                onChange={handleCategoryChange}
                options={CATEGORY_OPTIONS}
                placeholder="Select a category"
              />
            </div>
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Progress (%)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
            </div>
          </div>
          {/* Custom Category */}
          {selectedCategory === '📌 Other' && (
            <div>
              <label htmlFor="field-5" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Custom Category Name *
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => handleCustomCategoryChange(e.target.value)}
                placeholder="Enter custom category name"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
              />
            </div>
          )}

          {/* Assigned To */}
          {spaceMembers.length > 0 && (
            <div className="relative">
              <label htmlFor="field-assigned" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Assigned To
              </label>
              <Dropdown
                value={formData.assigned_to || ''}
                onChange={(value) => setFormData({ ...formData, assigned_to: value || undefined })}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...spaceMembers.map(member => ({
                    value: member.id,
                    label: member.name
                  }))
                ]}
                placeholder="Select a member"
              />
            </div>
          )}

          {/* Target Date */}
          <div>
            <label htmlFor="field-6" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Target Date
            </label>
            <input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
            />
          </div>

          {/* Depends On */}
          {availableGoals.length > 0 && (
            <div className="relative">
              <label htmlFor="field-7" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Depends on (optional)
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <div className="pl-12">
                  <Dropdown
                    value={formData.depends_on_goal_id || ''}
                    onChange={(value) => setFormData({ ...formData, depends_on_goal_id: value || '' })}
                    options={getDependencyOptions()}
                    placeholder="No dependency (can start immediately)"
                    className="pl-0"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                This goal will start after the selected goal is completed
              </p>
            </div>
          )}
      </form>
    </Modal>
  );
}
