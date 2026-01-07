'use client';

import { useState, useEffect, memo } from 'react';
import { X, Smile, ChevronDown, Repeat, Calendar, User, Clock, MessageSquare, Tag, Star, Users, CheckSquare, Home, Loader2, Trophy } from 'lucide-react';
import { CreateTaskInput, CreateChoreInput, Task, Chore } from '@/lib/types';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
import { choreCalendarService } from '@/lib/services/chore-calendar-service';
import { Dropdown } from '@/components/ui/Dropdown';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { logger } from '@/lib/logger';
import {
  TASK_CATEGORIES,
  CHORE_CATEGORIES,
  PRIORITY_LEVELS,
  FAMILY_ROLES,
  RECURRING_PATTERNS,
  STATUS_TYPES,
  EMOJIS
} from '@/lib/constants/item-categories';

type ItemType = 'task' | 'chore';
type ModalMode = 'create' | 'quickEdit';

interface UnifiedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CreateTaskInput | CreateChoreInput) => void | Promise<void | { id: string }>;
  editItem?: (Task & { type?: 'task' }) | (Chore & { type?: 'chore' }) | null;
  spaceId?: string;
  userId?: string;
  defaultType?: ItemType;
  mode?: ModalMode;
}

export const UnifiedItemModal = memo(function UnifiedItemModal({
  isOpen,
  onClose,
  onSave,
  editItem,
  spaceId,
  userId,
  defaultType = 'task',
  mode = 'create'
}: UnifiedItemModalProps) {
  const { currentSpace, createSpace, hasZeroSpaces } = useAuthWithSpaces();

  // Space management state
  const [actualSpaceId, setActualSpaceId] = useState<string | undefined>(spaceId);
  const [spaceCreationLoading, setSpaceCreationLoading] = useState(false);
  const [spaceError, setSpaceError] = useState<string>('');

  // Core state
  const [itemType, setItemType] = useState<ItemType>(defaultType);
  const [formData, setFormData] = useState<any>({
    space_id: actualSpaceId || '',
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    assigned_to: '',
    estimated_hours: '',
    tags: '',
    frequency: 'once', // Add missing frequency field for chores
    point_value: 10, // Default points for chores
  });

  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('basic');

  // Section navigation
  const sections = ['basic', 'details', 'family', 'schedule'];

  // Enhanced features state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringData, setRecurringData] = useState({
    pattern: 'weekly' as keyof typeof RECURRING_PATTERNS,
    interval: 0,
    days_of_week: [] as number[],
    end_date: '',
  });
  const [intervalTouched, setIntervalTouched] = useState(false);
  const [calendarSync, setCalendarSync] = useState(false);
  const [familyAssignment, setFamilyAssignment] = useState('unassigned');
  const [quickNote, setQuickNote] = useState('');

  // Set up space ID when modal opens
  useEffect(() => {
    if (isOpen) {
      if (spaceId) {
        // Use provided spaceId
        setActualSpaceId(spaceId);
        setFormData((prev: any) => ({ ...prev, space_id: spaceId }));
      } else if (currentSpace && !editItem) {
        // Use current space from context
        setActualSpaceId(currentSpace.id);
        setFormData((prev: any) => ({ ...prev, space_id: currentSpace.id }));
      } else if (editItem) {
        // For edit mode, keep existing space_id from the item
        setActualSpaceId(editItem.space_id);
        setFormData((prev: any) => ({ ...prev, space_id: editItem.space_id }));
      } else if (hasZeroSpaces) {
        // Zero spaces scenario - this should be handled by AppWithOnboarding
        // but if we get here, show a friendly error
        setSpaceError('Please create a workspace before adding items.');
      }
    }
  }, [isOpen, spaceId, currentSpace, editItem, hasZeroSpaces]);

  // Initialize form data
  useEffect(() => {
    if (editItem) {
      setItemType(editItem.type || 'task');
      setFormData({
        space_id: actualSpaceId || '',
        title: editItem.title || '',
        description: editItem.description || '',
        category: (editItem as any).category || '',
        priority: (editItem as any).priority || 'medium',
        status: editItem.status || 'pending',
        due_date: editItem.due_date || '',
        assigned_to: editItem.assigned_to || '',
        estimated_hours: (editItem as any).estimated_hours || '',
        tags: (editItem as any).tags || '',
        frequency: (editItem as any).frequency || 'once',
        point_value: (editItem as any).point_value || 10,
      });
    } else {
      // Reset for new items and set to defaultType
      setItemType(defaultType);
      setFormData({
        space_id: actualSpaceId || '',
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        assigned_to: '',
        estimated_hours: '',
        tags: '',
        frequency: 'once',
        point_value: 10,
      });
    }
    setActiveSection('basic');
    setIntervalTouched(false); // Reset interval touched state for new modal instances
  }, [editItem, actualSpaceId, isOpen, defaultType]);

  // Tab navigation using keyboard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Check if Tab or Shift+Tab is pressed
      if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Only handle if we're not inside an input/textarea/select
        const activeElement = document.activeElement;
        const isFormControl = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.hasAttribute('contenteditable')
        );

        if (!isFormControl) {
          event.preventDefault();

          const currentIndex = sections.indexOf(activeSection);
          let nextIndex;

          if (event.shiftKey) {
            // Shift+Tab: go to previous section
            nextIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
          } else {
            // Tab: go to next section
            nextIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0;
          }

          setActiveSection(sections[nextIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSection, sections]);

  // Form handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'due_date') setDateError('');
  };

  const handleTypeSwitch = (type: ItemType) => {
    setItemType(type);
    setFormData((prev: any) => ({ ...prev, category: '' })); // Reset category when switching
  };

  // Validation helper for recurring interval
  const getIntervalValidation = () => {
    const interval = recurringData.interval;

    if (!interval || interval === 0) {
      return { isValid: true, message: '' }; // Empty is valid, will default to 1 on blur
    }

    if (interval < 1) {
      return { isValid: false, message: 'Must be at least 1' };
    }

    switch (recurringData.pattern) {
      case 'daily':
        if (interval > 31) {
          return { isValid: false, message: 'Daily: max 31 days' };
        }
        break;
      case 'weekly':
        if (interval > 52) {
          return { isValid: false, message: 'Weekly: max 52 weeks' };
        }
        break;
      case 'monthly':
        if (interval > 12) {
          return { isValid: false, message: 'Monthly: max 12 months' };
        }
        break;
    }

    return { isValid: true, message: '' };
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      return;
    }

    // Check recurring validation if recurring is enabled
    if (isRecurring && !getIntervalValidation().isValid) {
      return;
    }

    // Ensure we have a space ID before proceeding
    if (!actualSpaceId) {
      setSpaceError('Space creation required');
      return;
    }

    try {
      // Validate due date
      if (formData.due_date && new Date(formData.due_date) < new Date()) {
        logger.info('❌ FAILED: Due date in past', { component: 'UnifiedItemModal' });
        setDateError('Due date cannot be in the past');
        return;
      }

      logger.info('✅ Date validation passed', { component: 'UnifiedItemModal' });

      // Prepare submission data - different fields for tasks vs chores
      const submissionData: CreateTaskInput | CreateChoreInput = itemType === 'task' ? {
        // Task-specific data - ONLY fields that exist in tasks table
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        priority: formData.priority || 'medium',
        status: formData.status || 'pending',
        due_date: formData.due_date || null,
        assigned_to: (formData.assigned_to && formData.assigned_to.trim()) || null,
        created_by: userId || '',
        estimated_hours: formData.estimated_hours || null,
        calendar_sync: calendarSync,
        quick_note: quickNote || null,
        tags: formData.tags || null,
        // Don't send: frequency (doesn't exist in tasks table)
      } as CreateTaskInput : {
        // Chore-specific data - ONLY fields that exist in chores table
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || null,
        frequency: formData.frequency || 'once',
        assigned_to: (formData.assigned_to && formData.assigned_to.trim()) || null,
        status: formData.status || 'pending',
        due_date: formData.due_date || null,
        created_by: userId || '',
        calendar_sync: calendarSync,
        point_value: formData.point_value || 10,
      } as CreateChoreInput;

      // Handle recurring tasks
      if (itemType === 'task' && isRecurring && userId) {
        // Type cast since we know this is a task
        const taskData = submissionData as CreateTaskInput;
        await taskRecurrenceService.createRecurringTask({
          space_id: taskData.space_id,
          title: taskData.title,
          description: taskData.description || undefined,
          category: taskData.category || undefined,
          priority: taskData.priority,
          assigned_to: taskData.assigned_to || undefined,
          created_by: userId,
          recurrence: {
            pattern: recurringData.pattern as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly',
            interval: recurringData.interval > 0 ? recurringData.interval : 1,
            days_of_week: recurringData.days_of_week,
            end_date: recurringData.end_date || undefined,
          }
        });
      } else if (itemType === 'chore' && isRecurring) {
        // Handle recurring chores by setting frequency field
        (submissionData as CreateChoreInput).frequency = recurringData.pattern as 'daily' | 'weekly' | 'biweekly' | 'monthly';
        logger.info('✅ Setting chore frequency to:', { component: 'UnifiedItemModal', data: recurringData.pattern });

        // Save the chore first
        const result = await onSave(submissionData);

        // If chore has calendar sync enabled and result contains the chore ID, sync to calendar
        if (calendarSync && result && typeof result === 'object' && 'id' in result) {
          try {
            logger.info('🗓️ Syncing chore to calendar...', { component: 'UnifiedItemModal' });
            await choreCalendarService.syncChoreToCalendar(result.id as string);
            logger.info('✅ Chore synced to calendar successfully', { component: 'UnifiedItemModal' });
          } catch (error) {
            logger.error('❌ Failed to sync chore to calendar:', error, { component: 'UnifiedItemModal', action: 'component_action' });
          }
        }
      } else if (itemType === 'chore') {
        // Handle non-recurring chores
        logger.info('💾 Calling onSave for chore...', { component: 'UnifiedItemModal' });
        const result = await onSave(submissionData);

        // If chore has calendar sync enabled and result contains the chore ID, sync to calendar
        if (calendarSync && result && typeof result === 'object' && 'id' in result) {
          try {
            logger.info('🗓️ Syncing chore to calendar...', { component: 'UnifiedItemModal' });
            await choreCalendarService.syncChoreToCalendar(result.id as string);
            logger.info('✅ Chore synced to calendar successfully', { component: 'UnifiedItemModal' });
          } catch (error) {
            logger.error('❌ Failed to sync chore to calendar:', error, { component: 'UnifiedItemModal', action: 'component_action' });
          }
        }
      } else {
        logger.info('💾 Calling onSave with submission data...', { component: 'UnifiedItemModal' });
        logger.info('onSave function:', { component: 'UnifiedItemModal', data: typeof onSave });
        await onSave(submissionData);
        logger.info('✅ onSave completed successfully', { component: 'UnifiedItemModal' });
      }

      logger.info('🚪 Closing modal...', { component: 'UnifiedItemModal' });
      onClose();
    } catch (error) {
      logger.error('❌ Failed to save item:', error, { component: 'UnifiedItemModal', action: 'component_action' });
      logger.error('Error details:', error, { component: 'UnifiedItemModal', action: 'component_action' });
    }
  };

  const getCurrentCategories = () => {
    return itemType === 'task' ? TASK_CATEGORIES : CHORE_CATEGORIES;
  };

  // Helper function to convert categories to dropdown options
  const getCategoryOptions = () => {
    const categories = getCurrentCategories();
    return Object.entries(categories).map(([key, category]) => ({
      value: key,
      label: `${category.emoji} ${category.label}`
    }));
  };

  // Helper function to convert priority levels to dropdown options
  const getPriorityOptions = () => {
    return Object.entries(PRIORITY_LEVELS).map(([key, priority]) => ({
      value: key,
      label: `${priority.emoji} ${priority.label} - ${priority.description}`
    }));
  };

  // Helper function to convert status types to dropdown options
  const getStatusOptions = () => {
    return Object.entries(STATUS_TYPES).map(([key, status]) => ({
      value: key,
      label: `${status.emoji} ${status.label} - ${status.description}`
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Enhanced Wide Modal */}
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-50 dark:bg-gray-800 sm:max-w-6xl sm:max-h-[95vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ overflowX: 'visible' }}>

        {/* Loading Overlay for Space Creation */}
        {spaceCreationLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Setting up your space...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {spaceError && !spaceCreationLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center max-w-sm mx-4">
              <p className="text-red-600 dark:text-red-400 mb-4">{spaceError}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Compact Elegant Header */}
        <div className="flex-shrink-0 bg-gradient-tasks text-white px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-500/20 sm:rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                {itemType === 'task' ? (
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {mode === 'create' ? 'New' : 'Edit'} {itemType === 'task' ? 'Task' : 'Chore'}
                </h2>
              </div>
            </div>

            {/* Right: Compact Toggle + Close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Sleek Pill Toggle */}
              <div className="flex items-center p-0.5 bg-white/15 rounded-full">
                <button
                  onClick={() => handleTypeSwitch('task')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    itemType === 'task'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">✅ </span>Task
                </button>
                <button
                  onClick={() => handleTypeSwitch('chore')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    itemType === 'chore'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">🏠 </span>Chore
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Wide Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">

            {/* Compact Section Navigation - Horizontal scroll on mobile */}
            <div className="flex gap-1.5 sm:gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-full sm:rounded-xl overflow-x-auto scrollbar-hide">
              {[
                { id: 'basic', label: 'Basics', emoji: '📝', icon: Tag },
                { id: 'details', label: 'Details', emoji: '⚡', icon: Star },
                { id: 'family', label: 'Family', emoji: '👥', icon: Users },
                { id: 'schedule', label: 'Schedule', emoji: '📅', icon: Calendar },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full sm:rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeSection === section.id
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="sm:hidden">{section.emoji}</span>
                  <section.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:block" />
                  <span>{section.label}</span>
                </button>
              ))}
            </div>

            {/* Basic Information Section */}
            {activeSection === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder={`What ${itemType} needs to be done?`}
                      className="w-full px-4 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Add details, instructions, or notes..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 resize-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <Dropdown
                      value={formData.category}
                      onChange={(value) => handleInputChange('category', value)}
                      options={getCategoryOptions()}
                      placeholder="Select a category"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <Dropdown
                      value={formData.priority}
                      onChange={(value) => handleInputChange('priority', value)}
                      options={getPriorityOptions()}
                      placeholder="Select priority..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Details Section */}
            {activeSection === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <Dropdown
                      value={formData.status}
                      onChange={(value) => handleInputChange('status', value)}
                      options={getStatusOptions()}
                      placeholder="Select status..."
                    />
                  </div>

                  {/* Points Value - Only for Chores */}
                  {itemType === 'chore' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          Points Reward
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.point_value}
                          onChange={(e) => handleInputChange('point_value', e.target.value)}
                          placeholder="10"
                          min="1"
                          max="1000"
                          className="w-full px-4 py-3 pr-16 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          pts
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Points earned when this chore is completed
                      </p>
                    </div>
                  )}

                  {/* Estimated Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estimated Time
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                        placeholder="How long will this take?"
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-3 pr-16 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        hours
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      placeholder="urgent, outdoor, fun, weekly..."
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>

                  {/* Quick Note for Collaboration */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quick Note for Family
                    </label>
                    <input
                      type="text"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Leave a quick note for the family..."
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Family Assignment Section */}
            {activeSection === 'family' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Family Member Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to Family Member
                    </label>
                    <Dropdown
                      value={familyAssignment}
                      onChange={(value) => setFamilyAssignment(value || '')}
                      options={Object.entries(FAMILY_ROLES).map(([key, role]) => ({
                        value: key,
                        label: `${role.emoji} ${role.label} - ${role.description}`
                      }))}
                      placeholder="Select family member..."
                    />
                  </div>

                  {/* Custom Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Or Assign to Specific Person
                    </label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                      placeholder="Enter name or email..."
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Section */}
            {activeSection === 'schedule' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Due Date */}
                  <div>
                    <DateTimePicker
                      value={formData.due_date}
                      onChange={(value) => handleInputChange('due_date', value)}
                      label="Due Date"
                      placeholder="Click to select date and time..."
                    />
                    {dateError && (
                      <p className="text-red-600 text-sm mt-1">{dateError}</p>
                    )}
                  </div>

                  {/* Calendar Sync Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Calendar Integration
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCalendarSync(!calendarSync)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          calendarSync ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          calendarSync ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {calendarSync ? 'Sync with calendar' : 'No calendar sync'}
                      </span>
                    </div>
                  </div>

                  {/* Recurring Toggle (Tasks & Chores) */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => {
                          setIsRecurring(!isRecurring);
                          setIntervalTouched(false); // Reset when toggling recurring mode
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          isRecurring
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Repeat className="w-4 h-4" />
                        <span>Make Recurring</span>
                      </button>
                    </div>

                    {/* Recurring Options */}
                    {isRecurring && (
                      <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            How often should this repeat?
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {/* Common repeat options */}
                            {[
                              { pattern: 'daily', interval: 1, label: '📅 Every day', desc: 'Daily' },
                              { pattern: 'daily', interval: 2, label: '📅 Every 2 days', desc: 'Every other day' },
                              { pattern: 'daily', interval: 3, label: '📅 Every 3 days', desc: 'Every 3rd day' },
                              { pattern: 'weekly', interval: 1, label: '📆 Every week', desc: 'Weekly' },
                              { pattern: 'weekly', interval: 2, label: '📆 Every 2 weeks', desc: 'Bi-weekly' },
                              { pattern: 'monthly', interval: 1, label: '📊 Every month', desc: 'Monthly' },
                            ].map((option) => {
                              const isSelected = recurringData.pattern === option.pattern && recurringData.interval === option.interval;
                              return (
                                <button
                                  key={`${option.pattern}-${option.interval}`}
                                  type="button"
                                  onClick={() => setRecurringData(prev => ({
                                    ...prev,
                                    pattern: option.pattern as keyof typeof RECURRING_PATTERNS,
                                    interval: option.interval
                                  }))}
                                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                                  }`}
                                >
                                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {option.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom option for advanced users */}
                          <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                              Custom schedule (advanced)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Dropdown
                                  value={recurringData.pattern}
                                  onChange={(value) => setRecurringData(prev => ({ ...prev, pattern: (value || 'daily') as keyof typeof RECURRING_PATTERNS }))}
                                  options={[
                                    { value: 'daily', label: 'Daily' },
                                    { value: 'weekly', label: 'Weekly' },
                                    { value: 'monthly', label: 'Monthly' }
                                  ]}
                                  placeholder="Select pattern..."
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2 relative">
                                <span className="text-xs text-gray-600 dark:text-gray-300">Every</span>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    max={recurringData.pattern === 'daily' ? 31 : recurringData.pattern === 'weekly' ? 52 : 12}
                                    value={recurringData.interval || ''}
                                    onFocus={(e) => {
                                      // Select all text when focused for easy replacement
                                      e.target.select();
                                    }}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        setRecurringData(prev => ({ ...prev, interval: 0 }));
                                        return;
                                      }

                                      const numValue = parseInt(value);
                                      if (!isNaN(numValue) && numValue >= 1) {
                                        // Set max limits based on pattern
                                        const maxLimit = recurringData.pattern === 'daily' ? 31 :
                                                       recurringData.pattern === 'weekly' ? 52 : 12;

                                        if (numValue <= maxLimit) {
                                          setRecurringData(prev => ({ ...prev, interval: numValue }));
                                        }
                                      }
                                    }}
                                    onBlur={() => {
                                      // Set to 1 if empty when leaving field
                                      if (!recurringData.interval || recurringData.interval === 0) {
                                        setRecurringData(prev => ({ ...prev, interval: 1 }));
                                      }
                                    }}
                                    className={`w-16 px-2 py-1 text-sm border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center ${
                                      getIntervalValidation().isValid
                                        ? 'border-gray-300 dark:border-gray-500'
                                        : 'border-red-500 dark:border-red-400'
                                    }`}
                                    placeholder="1"
                                  />

                                  {/* Error Tooltip */}
                                  {!getIntervalValidation().isValid && (
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-red-600 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                      {getIntervalValidation().message}
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-red-600"></div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-300">
                                  {recurringData.pattern === 'daily' ? 'days' : recurringData.pattern === 'weekly' ? 'weeks' : 'months'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Action Bar */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              {mode === 'create' ? 'Creating' : 'Editing'} {itemType} for your family
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logger.info('Submit button clicked', { component: 'UnifiedItemModal', data: { titleTrimmed: formData.title.trim(), dateError } });
                  handleSubmit();
                }}
                disabled={!formData.title.trim() || !!dateError}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-tasks text-white rounded-full transition-colors text-sm font-medium ${
                  !formData.title.trim() || dateError
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90 shadow-lg shadow-blue-500/25'
                }`}
              >
                {mode === 'create' ? 'Create' : 'Save'} {itemType === 'task' ? 'Task' : 'Chore'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});