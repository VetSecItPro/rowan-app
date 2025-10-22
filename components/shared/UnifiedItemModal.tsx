'use client';

import { useState, useEffect } from 'react';
import { X, Smile, ChevronDown, Repeat, Calendar, User, Clock, MessageSquare, Tag, Star, Users, CheckSquare, Home } from 'lucide-react';
import { CreateTaskInput, CreateChoreInput, Task, Chore } from '@/lib/types';
import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
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
  onSave: (item: CreateTaskInput | CreateChoreInput) => void;
  editItem?: (Task & { type?: 'task' }) | (Chore & { type?: 'chore' }) | null;
  spaceId: string;
  userId?: string;
  defaultType?: ItemType;
  mode?: ModalMode;
}

export function UnifiedItemModal({
  isOpen,
  onClose,
  onSave,
  editItem,
  spaceId,
  userId,
  defaultType = 'task',
  mode = 'create'
}: UnifiedItemModalProps) {
  // Core state
  const [itemType, setItemType] = useState<ItemType>(defaultType);
  const [formData, setFormData] = useState<any>({
    space_id: spaceId,
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
    interval: 1,
    days_of_week: [] as number[],
    end_date: '',
  });
  const [calendarSync, setCalendarSync] = useState(false);
  const [familyAssignment, setFamilyAssignment] = useState('unassigned');
  const [quickNote, setQuickNote] = useState('');

  // Initialize form data
  useEffect(() => {
    if (editItem) {
      setItemType(editItem.type || 'task');
      setFormData({
        space_id: spaceId,
        title: editItem.title || '',
        description: editItem.description || '',
        category: (editItem as any).category || '',
        priority: (editItem as any).priority || 'medium',
        status: editItem.status || 'pending',
        due_date: editItem.due_date || '',
        assigned_to: editItem.assigned_to || '',
        estimated_hours: (editItem as any).estimated_hours || '',
        tags: (editItem as any).tags || '',
        frequency: (editItem as any).frequency || 'once', // Add missing frequency field for chores
      });
    } else {
      // Reset for new items and set to defaultType
      setItemType(defaultType);
      setFormData({
        space_id: spaceId,
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
      });
    }
    setActiveSection('basic');
  }, [editItem, spaceId, isOpen, defaultType]);

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

  const handleSubmit = async () => {
    console.log('=== CHORE CREATION DEBUG ===');
    console.log('Title:', formData.title);
    console.log('Title trimmed:', formData.title.trim());
    console.log('Title check passed:', !!formData.title.trim());

    if (!formData.title.trim()) {
      console.log('❌ FAILED: Empty title - handleSubmit returning early');
      return;
    }

    console.log('✅ Title validation passed, continuing...');

    try {
      // Validate due date
      if (formData.due_date && new Date(formData.due_date) < new Date()) {
        console.log('❌ FAILED: Due date in past');
        setDateError('Due date cannot be in the past');
        return;
      }

      console.log('✅ Date validation passed');

      // Prepare submission data - different fields for tasks vs chores
      const submissionData = itemType === 'task' ? {
        // Task-specific data - ONLY fields that exist in tasks table
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        priority: formData.priority || 'medium',
        status: formData.status || 'pending',
        due_date: formData.due_date || null,
        assigned_to: familyAssignment !== 'unassigned' ? (familyAssignment || null) : (formData.assigned_to || null),
        created_by: userId || null,
        estimated_hours: formData.estimated_hours || null,
        calendar_sync: calendarSync,
        quick_note: quickNote || null,
        tags: formData.tags || null,
        // Don't send: frequency (doesn't exist in tasks table)
      } : {
        // Chore-specific data - ONLY fields that exist in chores table
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || null,
        frequency: formData.frequency || 'once',
        assigned_to: familyAssignment !== 'unassigned' ? (familyAssignment || null) : (formData.assigned_to || null),
        status: formData.status || 'pending',
        due_date: formData.due_date || null,
        created_by: userId || null,
        // Don't send: calendar_sync, category, tags, estimated_hours, quick_note, priority
      };

      console.log('Item type:', itemType);
      console.log('Submission data:', submissionData);
      console.log('Family assignment:', familyAssignment);
      console.log('User ID:', userId);

      // Handle recurring tasks
      if (itemType === 'task' && isRecurring && userId) {
        console.log('🔄 Creating recurring task...');
        await taskRecurrenceService.createRecurringTask({
          space_id: submissionData.space_id,
          title: submissionData.title,
          description: submissionData.description,
          category: submissionData.category,
          priority: submissionData.priority,
          assigned_to: submissionData.assigned_to,
          created_by: userId,
          recurrence: {
            pattern: recurringData.pattern,
            interval: recurringData.interval,
            days_of_week: recurringData.days_of_week,
            end_date: recurringData.end_date || undefined,
          }
        });
      } else {
        console.log('💾 Calling onSave with submission data...');
        console.log('onSave function:', typeof onSave);
        await onSave(submissionData);
        console.log('✅ onSave completed successfully');
      }

      console.log('🚪 Closing modal...');
      onClose();
    } catch (error) {
      console.error('❌ Failed to save item:', error);
      console.error('Error details:', error);
    }
  };

  const getCurrentCategories = () => {
    return itemType === 'task' ? TASK_CATEGORIES : CHORE_CATEGORIES;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Enhanced Wide Modal */}
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full max-w-6xl h-full max-h-[95vh] overflow-hidden rounded-none sm:rounded-2xl shadow-2xl flex flex-col">

        {/* Elegant Header with Gradient */}
        <div className="sticky top-0 z-10 bg-gradient-tasks text-white px-6 py-5 border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {itemType === 'task' ? (
                  <CheckSquare className="w-5 h-5 text-white" />
                ) : (
                  <Home className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {mode === 'create' ? 'Create New' : 'Edit'} {itemType === 'task' ? 'Task' : 'Chore'}
                </h2>
                <p className="text-blue-100 text-sm">Family collaboration made easy</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Type Toggle - Styled for brand color background */}
              <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg border border-white/20">
                <button
                  onClick={() => handleTypeSwitch('task')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    itemType === 'task'
                      ? 'bg-white text-blue-600 shadow-sm font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ✅ Task
                </button>
                <button
                  onClick={() => handleTypeSwitch('chore')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    itemType === 'chore'
                      ? 'bg-white text-blue-600 shadow-sm font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🏠 Chore
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Wide Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">

            {/* Section Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
              {[
                { id: 'basic', label: '📝 Basics', icon: Tag },
                { id: 'details', label: '⚡ Details', icon: Star },
                { id: 'family', label: '👥 Family', icon: Users },
                { id: 'schedule', label: '📅 Schedule', icon: Calendar },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
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
                      className="w-full px-4 py-3 text-lg border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 resize-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="">Select a category</option>
                        {Object.entries(getCurrentCategories()).map(([key, category]) => (
                          <option key={key} value={key}>
                            {category.emoji} {category.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none"
                      >
                        {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                          <option key={key} value={key}>
                            {priority.emoji} {priority.label} - {priority.description}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
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
                    <div className="relative">
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none"
                      >
                      {Object.entries(STATUS_TYPES).map(([key, status]) => (
                        <option key={key} value={key}>
                          {status.emoji} {status.label} - {status.description}
                        </option>
                      ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

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
                        className="w-full px-4 py-3 pr-16 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
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
                    <div className="relative">
                      <select
                        value={familyAssignment}
                        onChange={(e) => setFamilyAssignment(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none"
                      >
                      {Object.entries(FAMILY_ROLES).map(([key, role]) => (
                        <option key={key} value={key}>
                          {role.emoji} {role.label} - {role.description}
                        </option>
                      ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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

                  {/* Recurring Toggle (Tasks Only) */}
                  {itemType === 'task' && (
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setIsRecurring(!isRecurring)}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Repeat Pattern
                              </label>
                              <div className="relative">
                                <select
                                  value={recurringData.pattern}
                                  onChange={(e) => setRecurringData(prev => ({ ...prev, pattern: e.target.value as keyof typeof RECURRING_PATTERNS }))}
                                  className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white appearance-none"
                                >
                                {Object.entries(RECURRING_PATTERNS).map(([key, pattern]) => (
                                  <option key={key} value={key}>
                                    {pattern.emoji} {pattern.label} - {pattern.description}
                                  </option>
                                ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Every
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={recurringData.interval}
                                onChange={(e) => setRecurringData(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Action Bar */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'create' ? 'Creating' : 'Editing'} {itemType} for your family
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('🔘 Submit button clicked!');
                  console.log('Button disabled?', !formData.title.trim() || !!dateError);
                  console.log('Title:', `"${formData.title}"`);
                  console.log('Title trimmed:', `"${formData.title.trim()}"`);
                  console.log('Date error:', dateError);
                  handleSubmit();
                }}
                disabled={!formData.title.trim() || !!dateError}
                className={`px-8 py-3 bg-gradient-tasks text-white rounded-lg transition-colors font-medium ${
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
}