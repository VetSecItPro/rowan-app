'use client';

import { useState, useEffect } from 'react';
import { X, Smile, ChevronDown } from 'lucide-react';
import { CreateTaskInput, Task } from '@/lib/types';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Category configuration with colors and emojis
export const TASK_CATEGORIES = {
  work: { emoji: '💼', label: 'Work', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-100 dark:bg-blue-900/30' },
  personal: { emoji: '👤', label: 'Personal', color: 'bg-purple-500', textColor: 'text-purple-600', lightBg: 'bg-purple-100 dark:bg-purple-900/30' },
  home: { emoji: '🏠', label: 'Home', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-100 dark:bg-amber-900/30' },
  shopping: { emoji: '🛒', label: 'Shopping', color: 'bg-emerald-500', textColor: 'text-emerald-600', lightBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  health: { emoji: '💪', label: 'Health & Fitness', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-100 dark:bg-green-900/30' },
  finance: { emoji: '💰', label: 'Finance', color: 'bg-yellow-500', textColor: 'text-yellow-600', lightBg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  education: { emoji: '📚', label: 'Education', color: 'bg-indigo-500', textColor: 'text-indigo-600', lightBg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  family: { emoji: '👨‍👩‍👧‍👦', label: 'Family', color: 'bg-pink-500', textColor: 'text-pink-600', lightBg: 'bg-pink-100 dark:bg-pink-900/30' },
  social: { emoji: '🎉', label: 'Social', color: 'bg-orange-500', textColor: 'text-orange-600', lightBg: 'bg-orange-100 dark:bg-orange-900/30' },
  other: { emoji: '📌', label: 'Other', color: 'bg-gray-500', textColor: 'text-gray-600', lightBg: 'bg-gray-100 dark:bg-gray-900/30' },
};

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskInput) => void;
  editTask?: Task | null;
  spaceId: string;
}

export function NewTaskModal({ isOpen, onClose, onSave, editTask, spaceId }: NewTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    space_id: spaceId,
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    assigned_to: '',
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dateError, setDateError] = useState<string>('');

  // Populate form when editing
  useEffect(() => {
    if (editTask) {
      setFormData({
        space_id: spaceId,
        title: editTask.title,
        description: editTask.description || '',
        category: editTask.category || '',
        priority: editTask.priority || 'medium',
        status: editTask.status || 'pending',
        due_date: editTask.due_date || '',
        assigned_to: editTask.assigned_to || '',
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        assigned_to: '',
      });
    }
    setShowEmojiPicker(false);
    setDateError('');
  }, [editTask, spaceId, isOpen]);

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
    const cleanedData: CreateTaskInput = {
      ...formData,
      description: formData.description || undefined,
      category: formData.category || undefined,
      due_date: formData.due_date || undefined,
      assigned_to: formData.assigned_to || undefined,
    };

    onSave(cleanedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">
              {editTask ? 'Edit Task' : 'Create New Task'}
            </h2>
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
              Task Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete project report"
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this task..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Priority
              </label>
              <div className="relative">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Status
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Category & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="field-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Category
              </label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white appearance-none"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="">Select category...</option>
                  <option value="work">💼 Work</option>
                  <option value="personal">👤 Personal</option>
                  <option value="home">🏠 Home</option>
                  <option value="shopping">🛒 Shopping</option>
                  <option value="health">💪 Health & Fitness</option>
                  <option value="finance">💰 Finance</option>
                  <option value="education">📚 Education</option>
                  <option value="family">👨‍👩‍👧‍👦 Family</option>
                  <option value="social">🎉 Social</option>
                  <option value="other">📌 Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => {
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
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
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
              {editTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
