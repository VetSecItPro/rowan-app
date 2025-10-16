'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock, ChevronDown, TrendingUp, Sparkles, Zap, X } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { NewReminderModal } from '@/components/reminders/NewReminderModal';
import { BulkActionsToolbar } from '@/components/reminders/BulkActionsToolbar';
import GuidedReminderCreation from '@/components/guided/GuidedReminderCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { remindersService, Reminder, CreateReminderInput } from '@/lib/services/reminders-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { reminderTemplatesService, ReminderTemplate } from '@/lib/services/reminder-templates-service';

export default function RemindersPage(): JSX.Element {
  const { currentSpace, user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'bills' | 'health' | 'work' | 'personal' | 'household'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_date' | 'title'>('due_date');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [popularTemplates, setPopularTemplates] = useState<ReminderTemplate[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(new Set());
  const [displayLimit, setDisplayLimit] = useState(20); // Pagination: show 20 items initially

  const ITEMS_PER_PAGE = 20;

  // Memoized filtered reminders - expensive filtering operation
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Assignment filter
    if (assignmentFilter !== 'all' && user) {
      if (assignmentFilter === 'mine') {
        filtered = filtered.filter(r => r.assigned_to === user.id);
      } else if (assignmentFilter === 'unassigned') {
        filtered = filtered.filter(r => !r.assigned_to);
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query)
      );
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'due_date': {
          // Sort by reminder_time, with nulls at the end
          if (!a.reminder_time && !b.reminder_time) return 0;
          if (!a.reminder_time) return 1;
          if (!b.reminder_time) return -1;
          return new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime();
        }
        case 'priority': {
          // Priority order: urgent > high > medium > low
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        case 'created_date': {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'title': {
          return a.title.localeCompare(b.title);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [reminders, statusFilter, assignmentFilter, categoryFilter, priorityFilter, searchQuery, sortBy, user]);

  // Memoized stats calculation - expensive computation
  const stats = useMemo(() => {
    const now = new Date();

    const total = reminders.length;
    const active = reminders.filter(r => r.status === 'active').length;
    const completed = reminders.filter(r => r.status === 'completed').length;
    const overdue = reminders.filter(r => {
      if (r.status !== 'active' || !r.reminder_time) return false;
      const reminderTime = new Date(r.reminder_time);
      return reminderTime < now;
    }).length;

    return { total, active, completed, overdue };
  }, [reminders]);

  // Paginated reminders for performance with large lists
  const paginatedReminders = useMemo(() => {
    return filteredReminders.slice(0, displayLimit);
  }, [filteredReminders, displayLimit]);

  const hasMoreReminders = filteredReminders.length > displayLimit;
  const remainingCount = filteredReminders.length - displayLimit;

  // Handlers for pagination
  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + ITEMS_PER_PAGE);
  }, [ITEMS_PER_PAGE]);

  const handleShowAll = useCallback(() => {
    setDisplayLimit(filteredReminders.length);
  }, [filteredReminders.length]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [statusFilter, assignmentFilter, categoryFilter, priorityFilter, searchQuery, sortBy, ITEMS_PER_PAGE]);

  // Stable reference to loadReminders
  const loadReminders = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [remindersData, statsData, userProgressResult, templatesData] = await Promise.all([
        remindersService.getReminders(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
        getUserProgress(user.id),
        reminderTemplatesService.getPopularTemplates(currentSpace.id, 5),
      ]);

      setReminders(remindersData);
      setPopularTemplates(templatesData);

      // Check if user has completed the guided reminder flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_reminder_created);
      }

      // Show guided flow if no reminders exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        remindersData.length === 0 &&
        !userProgress?.first_reminder_created &&
        !userProgress?.skipped_reminder_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Memoized callback for creating/updating reminders
  const handleCreateReminder = useCallback(async (reminderData: CreateReminderInput) => {
    try {
      // Check if we're updating an existing reminder (has an id) or creating a new one
      if (editingReminder && editingReminder.id) {
        await remindersService.updateReminder(editingReminder.id, reminderData);
      } else {
        // Create new reminder (even if editingReminder is set, if it has no id, it's new)
        await remindersService.createReminder(reminderData);
      }
      loadReminders();
      setEditingReminder(null);
    } catch (error) {
      console.error('Failed to save reminder:', error);
    }
  }, [editingReminder, loadReminders]);

  // Memoized callback for status changes
  const handleStatusChange = useCallback(async (reminderId: string, status: string) => {
    // Optimistic update - update UI immediately
    setReminders(prevReminders =>
      prevReminders.map(reminder =>
        reminder.id === reminderId ? { ...reminder, status: status as 'active' | 'completed' | 'snoozed' } : reminder
      )
    );

    // Update in background
    try {
      await remindersService.updateReminder(reminderId, { status: status as 'active' | 'completed' | 'snoozed' });
    } catch (error) {
      console.error('Failed to update reminder status:', error);
      loadReminders(); // Revert on error
    }
  }, [loadReminders]);

  // Memoized callback for deleting reminders
  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    try {
      await remindersService.deleteReminder(reminderId);
      loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }, [loadReminders]);

  // Memoized callback for snoozing reminders
  const handleSnoozeReminder = useCallback(async (reminderId: string, minutes: number) => {
    if (!user) return;
    try {
      await remindersService.snoozeReminder(reminderId, minutes, user.id);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }, [loadReminders, user]);

  // Memoized callback for editing reminders
  const handleEditReminder = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  }, []);

  // Memoized callback for closing modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingReminder(null);
  }, []);

  // Memoized callback for opening new reminder modal
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Memoized callback for search query changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoized callback for status filter changes
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadReminders(); // Reload to show newly created reminder
  }, [loadReminders]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'reminder_guide');
      } catch (error) {
        console.error('Failed to mark reminder guide as skipped:', error);
      }
    }
  }, [user]);

  const handleQuickTemplateCreate = useCallback((template: ReminderTemplate) => {
    if (!currentSpace || !user) return;

    // Apply template with defaults to get pre-filled data
    const reminderData = reminderTemplatesService.applyTemplate(template, {});

    // Create a partial reminder object with template data (not saved yet)
    const templateReminder: Partial<Reminder> = {
      space_id: currentSpace.id,
      title: reminderData.title,
      description: reminderData.description,
      emoji: reminderData.emoji,
      category: reminderData.category as any,
      priority: reminderData.priority as any,
      reminder_time: reminderData.reminder_time,
      repeat_pattern: reminderData.repeat_pattern,
      repeat_days: reminderData.repeat_days,
      status: 'active',
    };

    // Open modal with pre-filled template data
    setEditingReminder(templateReminder as Reminder);
    setIsModalOpen(true);

    // Increment template usage (they clicked on it)
    reminderTemplatesService.incrementUsage(template.id).catch((error) => {
      console.error('Failed to increment template usage:', error);
    });
  }, [currentSpace, user]);

  const handleSelectionChange = useCallback((reminderId: string, selected: boolean) => {
    setSelectedReminderIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(reminderId);
      } else {
        newSet.delete(reminderId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedReminderIds.size === filteredReminders.length) {
      setSelectedReminderIds(new Set());
    } else {
      setSelectedReminderIds(new Set(filteredReminders.map((r) => r.id)));
    }
  }, [filteredReminders, selectedReminderIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedReminderIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleBulkOperationComplete = useCallback(() => {
    setSelectedReminderIds(new Set());
    loadReminders();
  }, [loadReminders]);

  const selectedReminders = useMemo(() => {
    return reminders.filter((r) => selectedReminderIds.has(r.id));
  }, [reminders, selectedReminderIds]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reminders' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-reminders flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-reminders bg-clip-text text-transparent">
                  Reminders
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Never forget important moments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-2 w-full sm:w-auto">
              {!selectionMode ? (
                <>
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg flex items-center justify-center gap-2 group relative"
                    title="Select multiple reminders to complete, delete, or snooze them all at once"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="hidden sm:inline">Bulk Select</span>

                    {/* Tooltip - appears on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                      Select multiple reminders for bulk actions
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </button>
                  <button
                    onClick={handleOpenModal}
                    className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-3 shimmer-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    New Reminder
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClearSelection}
                  className="w-full px-4 py-2 sm:px-6 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  Cancel Selection
                </button>
              )}
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedReminderCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Cards - Horizontal Row - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="stats-grid-mobile gap-4 sm:gap-6">
            {/* Active */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                {stats.active > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Overdue</h3>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
                {stats.overdue > 0 && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Urgent!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((stats.completed / stats.total) * 100);
                        if (percentage >= 67) return `${percentage}% 🎉`;
                        if (percentage >= 34) return `${percentage}%`;
                        return percentage > 0 ? `${percentage}%` : 'Start';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total</h3>
                <div className="w-12 h-12 bg-gradient-reminders rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                    <Bell className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Popular Templates Quick Actions */}
          {!showGuidedFlow && popularTemplates.length > 0 && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-200 dark:border-pink-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Templates
                </h3>
                <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-300 text-xs font-medium rounded-full">
                  Popular
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Quick start with pre-filled templates – customize before saving
              </p>

              {/* Mobile: Horizontal Scrolling | Desktop: Grid */}
              <div className="relative">
                {/* Scroll fade indicators - mobile only */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-pink-50 dark:from-pink-900/10 to-transparent pointer-events-none z-10 sm:hidden" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-pink-50 dark:from-pink-900/10 to-transparent pointer-events-none z-10 sm:hidden" />

                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:overflow-x-visible">
                  {popularTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleQuickTemplateCreate(template)}
                      className="flex-none w-[240px] sm:w-auto snap-start flex flex-col items-start p-4 bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 rounded-lg hover:shadow-lg hover:scale-105 transition-all text-left group min-h-[120px]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{template.emoji}</span>
                        <Zap className="w-4 h-4 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="text-base sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Swipe hint - mobile only */}
                {popularTemplates.length > 2 && (
                  <div className="text-center mt-3 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                    ← Swipe to see more →
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search & Filter Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                {/* Search and Sort Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="search"
                      inputMode="search"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"

                      placeholder="Search reminders..."
                      value={searchQuery}
                      onChange={handleSearchChange}

                      className="w-full pl-4 pr-20 py-3 text-base md:pl-4 md:pr-20 md:py-2 md:text-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-gray-900 dark:text-white"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none pl-4 pr-10 py-2.5 sm:py-2 bg-white dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:border-pink-300 dark:hover:border-pink-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors cursor-pointer"
                    >
                      <option value="due_date">Sort: Due Date</option>
                      <option value="priority">Sort: Priority</option>
                      <option value="created_date">Sort: Newest</option>
                      <option value="title">Sort: A-Z</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Category & Priority Filters - Combined Row */}
                <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6">
                  {/* Category Filter Pills */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'all'
                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-pink-900/20'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setCategoryFilter('bills')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'bills'
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}
                      >
                        <span>💰</span> Bills
                      </button>
                      <button
                        onClick={() => setCategoryFilter('health')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'health'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                      >
                        <span>❤️</span> Health
                      </button>
                      <button
                        onClick={() => setCategoryFilter('work')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'work'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        <span>💼</span> Work
                      </button>
                      <button
                        onClick={() => setCategoryFilter('personal')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'personal'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                        }`}
                      >
                        <span>✨</span> Personal
                      </button>
                      <button
                        onClick={() => setCategoryFilter('household')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          categoryFilter === 'household'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        }`}
                      >
                        <span>🏠</span> Household
                      </button>
                    </div>
                  </div>

                  {/* Priority Filter Pills */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPriorityFilter('all')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all min-h-[44px] md:min-h-0 ${
                          priorityFilter === 'all'
                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-pink-900/20'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setPriorityFilter('urgent')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          priorityFilter === 'urgent'
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/40'
                        }`}
                      >
                        🔴 Urgent
                      </button>
                      <button
                        onClick={() => setPriorityFilter('high')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          priorityFilter === 'high'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                        }`}
                      >
                        🟠 High
                      </button>
                      <button
                        onClick={() => setPriorityFilter('medium')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          priorityFilter === 'medium'
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                        }`}
                      >
                        🟡 Medium
                      </button>
                      <button
                        onClick={() => setPriorityFilter('low')}
                        className={`px-4 py-2.5 md:px-3 md:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1 min-h-[44px] md:min-h-0 ${
                          priorityFilter === 'low'
                            ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        ⚪ Low
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Reminders List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* Header with Month Badge and Filters - Now with filters on the right */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              {/* Left side: Title and month badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Reminders ({filteredReminders.length})
                </h2>
                <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
                {selectionMode && filteredReminders.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 md:px-3 md:py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-full hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors min-h-[44px] md:min-h-0"
                  >
                    {selectedReminderIds.size === filteredReminders.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Right side: Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Assignment Filter */}
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-700 rounded-lg p-1 flex gap-1 w-fit">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'all'
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('mine')}
                    className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'mine'
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                    }`}
                  >
                    My Reminders
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('unassigned')}
                    className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                      assignmentFilter === 'unassigned'
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                    }`}
                  >
                    Unassigned
                  </button>
                </div>

                {/* Status Filter - Segmented Buttons */}
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-700 rounded-lg p-1 flex gap-1 w-fit">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('snoozed')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[70px] ${
                    statusFilter === 'snoozed'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Snoozed
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                    statusFilter === 'completed'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-56" />
                      </div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-24" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2" />
                    <div className="flex items-center gap-3 mt-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReminders.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No reminders found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first reminder to get started!'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleOpenModal}
                      className="btn-touch shimmer-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create Reminder
                    </button>
                    {!hasCompletedGuide && (
                      <button
                        onClick={() => setShowGuidedFlow(true)}
                        className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                      >
                        <Bell className="w-5 h-5" />
                        Try Guided Creation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {paginatedReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEditReminder}
                      onDelete={handleDeleteReminder}
                      onSnooze={handleSnoozeReminder}
                      selectionMode={selectionMode}
                      selected={selectedReminderIds.has(reminder.id)}
                      onSelectionChange={handleSelectionChange}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {hasMoreReminders && (
                  <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {paginatedReminders.length} of {filteredReminders.length} reminders
                      <span className="ml-1 text-gray-500">({remainingCount} more)</span>
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all shadow-md inline-flex items-center gap-2 font-medium"
                      >
                        Load {remainingCount > ITEMS_PER_PAGE ? ITEMS_PER_PAGE : remainingCount} More
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleShowAll}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all inline-flex items-center gap-2 font-medium"
                      >
                        Show All ({remainingCount})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* New/Edit Reminder Modal */}
      {currentSpace ? (
        <NewReminderModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateReminder}
          editReminder={editingReminder}
          spaceId={currentSpace.id}
        />
      ) : (
        /* Show a message if no space exists */
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Space Available</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You need to create or join a space before creating reminders.
              </p>
              <button
                onClick={handleCloseModal}
                className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}

      {/* Bulk Actions Toolbar */}
      {currentSpace && (
        <BulkActionsToolbar
          selectedCount={selectedReminderIds.size}
          selectedReminders={selectedReminders}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkOperationComplete}
          spaceId={currentSpace.id}
        />
      )}
    </FeatureLayout>
  );
}
