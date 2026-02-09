'use client';

import { useState } from 'react';
import { Smile, ChevronDown, Repeat, Loader2 } from 'lucide-react';
import { CreateTaskInput, Task } from '@/lib/types';
import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Category configuration with colors and emojis
export const TASK_CATEGORIES = {
  work: { emoji: '💼', label: 'Work', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-900/30' },
  personal: { emoji: '👤', label: 'Personal', color: 'bg-purple-500', textColor: 'text-purple-600', lightBg: 'bg-purple-900/30' },
  home: { emoji: '🏠', label: 'Home', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-900/30' },
  shopping: { emoji: '🛒', label: 'Shopping', color: 'bg-emerald-500', textColor: 'text-emerald-600', lightBg: 'bg-emerald-900/30' },
  health: { emoji: '💪', label: 'Health & Fitness', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-900/30' },
  finance: { emoji: '💰', label: 'Finance', color: 'bg-yellow-500', textColor: 'text-yellow-600', lightBg: 'bg-yellow-900/30' },
  education: { emoji: '📚', label: 'Education', color: 'bg-indigo-500', textColor: 'text-indigo-600', lightBg: 'bg-indigo-900/30' },
  family: { emoji: '👨‍👩‍👧‍👦', label: 'Family', color: 'bg-pink-500', textColor: 'text-pink-600', lightBg: 'bg-pink-900/30' },
  social: { emoji: '🎉', label: 'Social', color: 'bg-orange-500', textColor: 'text-orange-600', lightBg: 'bg-orange-900/30' },
  other: { emoji: '📌', label: 'Other', color: 'bg-gray-500', textColor: 'text-gray-600', lightBg: 'bg-gray-900/30' },
};

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskInput) => void;
  editTask?: Task | null;
  spaceId?: string;
  userId?: string;
}

type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

const buildInitialFormData = (
  editTask: Task | null | undefined,
  spaceId: string | undefined,
  userId: string | undefined
): CreateTaskInput => {
  if (editTask) {
    const editTaskData = editTask as Partial<Task> & {
      calendar_sync?: boolean;
      quick_note?: string;
      tags?: string;
    };

    return {
      space_id: spaceId || editTask.space_id || '',
      title: editTask.title,
      description: editTask.description || '',
      category: editTask.category || '',
      priority: editTask.priority || 'medium',
      status: editTask.status || 'pending',
      due_date: editTask.due_date || '',
      assigned_to: editTask.assigned_to || '',
      created_by: editTask.created_by || userId || '',
      calendar_sync: editTaskData.calendar_sync || false,
      quick_note: editTaskData.quick_note || '',
      tags: editTaskData.tags || '',
    };
  }

  return {
    space_id: spaceId || '',
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    assigned_to: '',
    created_by: userId || '',
    calendar_sync: false,
    quick_note: '',
    tags: '',
  };
};

function TaskForm({ isOpen, onClose, onSave, editTask, spaceId, userId }: NewTaskModalProps) {
  const { currentSpace, hasZeroSpaces } = useAuthWithSpaces();
  const resolvedSpaceId = spaceId || editTask?.space_id || currentSpace?.id;
  const spaceCreationLoading = false;
  const [spaceError, _setSpaceError] = useState<string>(
    hasZeroSpaces && isOpen && !resolvedSpaceId ? 'Please create a workspace before adding tasks.' : ''
  );

  const [formData, setFormData] = useState<CreateTaskInput>({
    ...buildInitialFormData(editTask, resolvedSpaceId, userId),
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringData, setRecurringData] = useState({
    pattern: 'weekly' as RecurrencePattern,
    interval: 1,
    daysOfWeek: [] as number[],
  });

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Ensure we have a space ID before proceeding
    if (!resolvedSpaceId) {
      setDateError('Space creation required');
      return;
    }

    // Handle recurring tasks
    if (isRecurring && !editTask && userId) {
      try {
        await taskRecurrenceService.createRecurringTask({
          space_id: resolvedSpaceId,
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category || undefined,
          priority: formData.priority,
          created_by: userId,
          recurrence: {
            pattern: recurringData.pattern,
            interval: recurringData.interval,
            days_of_week: recurringData.daysOfWeek,
          },
        });
        onSave(formData); // Call onSave to refresh the task list
        onClose();
        return;
      } catch (error) {
        logger.error('Error creating recurring task:', error, { component: 'NewTaskModal', action: 'component_action' });
        setDateError('Failed to create recurring task');
        return;
      }
    }

    // Handle regular tasks (create or edit)
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

  const footerContent = (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        data-testid="task-submit-button"
        type="submit"
        form="new-task-form"
        disabled={!!dateError}
        className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full transition-colors font-medium text-sm sm:text-base ${
          dateError ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'
        }`}
      >
        {editTask ? 'Update Task' : 'Create Task'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTask ? 'Edit Task' : 'Create New Task'}
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
      footer={footerContent}
    >
      {/* Loading Overlay for Space Creation */}
      {spaceCreationLoading && (
        <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Setting up your space...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {spaceError && !spaceCreationLoading && (
        <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center max-w-sm mx-4">
            <p className="text-red-400 mb-4">{spaceError}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form id="new-task-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Task Title *
            </label>
            <div className="relative">
              <input
                data-testid="task-title-input"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete project report"
                className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-3 z-50 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-10 h-10 text-xl flex items-center justify-center hover:bg-gray-700 rounded-md transition-colors"
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
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this task..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            />
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Priority */}
            <div className="relative z-50">
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Priority
              </label>
              <div className="relative">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white relative z-50"
                  style={{ position: 'relative', zIndex: 9999 }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Status */}
            <div className="relative z-50">
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Status
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed' })}
                  className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white relative z-50"
                  style={{ position: 'relative', zIndex: 9999 }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>
          </div>

          {/* Category & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Category */}
            <div className="relative z-50">
              <label htmlFor="field-5" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Category
              </label>
              <div className="relative">
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white relative z-50"
                  style={{ position: 'relative', zIndex: 9999 }}
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
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date || ''}
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
                className={`w-full px-4 py-3 bg-gray-800/60 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white ${
                  dateError ? 'border-red-500' : 'border-gray-700/50'
                }`}
              />
              {dateError && (
                <p className="mt-2 text-base md:text-sm text-red-400 flex items-center gap-1">
                  <span className="font-medium">⚠</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Recurring Task Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border-2 ${
                  isRecurring
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>Repeat</span>
              </button>
              {isRecurring && (
                <span className="text-sm text-gray-400">
                  Create recurring task
                </span>
              )}
            </div>

            {/* Recurring Options - Collapsible */}
            {isRecurring && (
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-900 rounded-lg border border-gray-700">
                {/* Pattern and Interval Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pattern
                    </label>
                    <div className="relative">
                      <select
                        value={recurringData.pattern}
                        onChange={(e) => setRecurringData({
                          ...recurringData,
                          pattern: e.target.value as RecurrencePattern,
                          daysOfWeek: [] // Reset days when pattern changes
                        })}
                        className="w-full pl-4 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white appearance-none"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Every
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={recurringData.interval}
                      onChange={(e) => setRecurringData({
                        ...recurringData,
                        interval: Math.max(1, parseInt(e.target.value) || 1)
                      })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    />
                  </div>
                </div>

                {/* Days of Week - Show for weekly and biweekly patterns */}
                {(recurringData.pattern === 'weekly' || recurringData.pattern === 'biweekly') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                      Days of Week
                    </label>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const days = recurringData.daysOfWeek.includes(idx)
                              ? recurringData.daysOfWeek.filter(d => d !== idx)
                              : [...recurringData.daysOfWeek, idx];
                            setRecurringData({ ...recurringData, daysOfWeek: days });
                          }}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all text-xs sm:text-sm font-medium border-2 ${
                            recurringData.daysOfWeek.includes(idx)
                              ? 'bg-blue-500 text-white border-blue-400'
                              : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

      </form>
    </Modal>
  );
}

export function NewTaskModal(props: NewTaskModalProps) {
  const { editTask, isOpen, spaceId, userId } = props;
  const formKey = `${editTask?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}-${spaceId ?? 'none'}-${userId ?? 'anon'}`;
  return <TaskForm key={formKey} {...props} />;
}
