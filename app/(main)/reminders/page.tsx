'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock, ChevronDown, TrendingUp, Sparkles, Zap } from 'lucide-react';
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
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [popularTemplates, setPopularTemplates] = useState<ReminderTemplate[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(new Set());

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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reminders, statusFilter, assignmentFilter, searchQuery, user]);

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
      if (editingReminder) {
        await remindersService.updateReminder(editingReminder.id, reminderData);
      } else {
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
    try {
      await remindersService.snoozeReminder(reminderId, minutes);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }, [loadReminders]);

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

  const handleQuickTemplateCreate = useCallback(async (template: ReminderTemplate) => {
    if (!currentSpace || !user) return;

    try {
      // Apply template with defaults
      const reminderData = reminderTemplatesService.applyTemplate(template, {});

      // Create reminder
      await remindersService.createReminder({
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
      });

      // Increment template usage
      await reminderTemplatesService.incrementUsage(template.id);

      // Reload reminders
      loadReminders();
    } catch (error) {
      console.error('Failed to create reminder from template:', error);
    }
  }, [currentSpace, user, loadReminders]);

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

            <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
                Create common reminders with one click
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {popularTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleQuickTemplateCreate(template)}
                    className="flex flex-col items-start p-4 bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded-lg hover:shadow-lg hover:scale-105 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{template.emoji}</span>
                      <Zap className="w-4 h-4 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reminders..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
          )}

          {/* Reminders List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* Header with Month Badge and Filters */}
            <div className="flex flex-col items-start gap-4 mb-6">
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
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {selectedReminderIds.size === filteredReminders.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                {/* Assignment Filter */}
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-1 flex gap-1 w-fit">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('mine')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'mine'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    My Reminders
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('unassigned')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] ${
                      assignmentFilter === 'unassigned'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    Unassigned
                  </button>
                </div>

                {/* Status Filter - Segmented Buttons */}
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-700 rounded-lg p-1 flex gap-1 w-fit">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('snoozed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[70px] ${
                    statusFilter === 'snoozed'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Snoozed
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] ${
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
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reminders...</p>
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
                      className="px-6 py-3 shimmer-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
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
              <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {filteredReminders.map((reminder) => (
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
