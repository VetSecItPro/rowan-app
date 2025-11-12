'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock, ChevronDown, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { NewReminderModal } from '@/components/reminders/NewReminderModal';
import { BulkActionsToolbar } from '@/components/reminders/BulkActionsToolbar';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { remindersService, Reminder, CreateReminderInput } from '@/lib/services/reminders-service';
import { CTAButton } from '@/components/ui/EnhancedButton';

export default function RemindersPage(): JSX.Element {
  const { currentSpace, user, loading: authLoading } = useAuthWithSpaces();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'bills' | 'health' | 'work' | 'personal' | 'household'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_date' | 'title'>('due_date');
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
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          const aPriority = a.priority || 'medium';
          const bPriority = b.priority || 'medium';
          return priorityOrder[aPriority] - priorityOrder[bPriority];
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
    // Don't load data if auth is still loading
    if (authLoading) {
      return;
    }

    // Don't load data if user doesn't have a space yet (after auth has loaded)
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [remindersData, statsData] = await Promise.all([
        remindersService.getReminders(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
      ]);

      setReminders(remindersData);

    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user, authLoading]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Memoized callback for creating/updating reminders
  const handleCreateReminder = useCallback(async (reminderData: CreateReminderInput) => {
    try {
      // Check if we're updating an existing reminder (has an id) or creating a new one
      if (editingReminder && editingReminder.id) {
        await remindersService.updateReminder(editingReminder.id, reminderData);
        loadReminders();
      } else {
        // Create new reminder with optimistic update
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticReminder: Reminder = {
          id: tempId,
          ...reminderData,
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active',
          // Add placeholder user data if not present
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url
          } : undefined,
        };

        // Optimistic update - add immediately to UI
        setReminders(prevReminders => [optimisticReminder, ...prevReminders]);

        try {
          // Make the actual API call
          const newReminder = await remindersService.createReminder(reminderData);

          // Replace optimistic item with real one
          setReminders(prevReminders =>
            prevReminders.map(reminder =>
              reminder.id === tempId ? newReminder : reminder
            )
          );
        } catch (apiError) {
          // Remove optimistic item on failure
          setReminders(prevReminders =>
            prevReminders.filter(reminder => reminder.id !== tempId)
          );
          throw apiError; // Re-throw to be caught by outer try/catch
        }
      }
      setEditingReminder(null);
    } catch (error) {
      console.error('Failed to save reminder:', error);
      // Could add toast notification here for better UX
      alert('Failed to save reminder. Please try again.');
    }
  }, [editingReminder, user]);

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
    // Optimistic update - remove from UI immediately
    setReminders(prev => prev.filter(reminder => reminder.id !== reminderId));

    try {
      await remindersService.deleteReminder(reminderId);
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      // Revert optimistic update on error
      loadReminders();
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
    setEditingReminder(null); // Clear any previous reminder data
    setIsModalOpen(true);
  }, []);

  // Memoized callback for search query changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchTyping(true);
    setTimeout(() => setIsSearchTyping(false), 300);
  }, []);

  // Memoized callback for status filter changes
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

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
      <PageErrorBoundary>
        <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-reminders flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
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
                  <CTAButton
                    onClick={handleOpenModal}
                    feature="reminders"
                    icon={<Plus className="w-5 h-5" />}
                    className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-3"
                  >
                    New Reminder
                  </CTAButton>
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

          {/* Stats Cards - Horizontal Row */}
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
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Bell className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                {/* Search and Sort Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search */}
                  <div className="flex-1 max-w-none">
                    <div className={`apple-search-container reminders-search group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
                      <Search className="apple-search-icon" />
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
                        className="apple-search-input"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="apple-search-clear"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative w-40 flex-shrink-0">
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
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          categoryFilter === 'all'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setCategoryFilter('bills')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          categoryFilter === 'bills'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/20'
                        }`}
                      >
                        <span>💰</span> Bills
                      </button>
                      <button
                        onClick={() => setCategoryFilter('health')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          categoryFilter === 'health'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <span>❤️</span> Health
                      </button>
                      <button
                        onClick={() => setCategoryFilter('work')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          categoryFilter === 'work'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <span>💼</span> Work
                      </button>
                      <button
                        onClick={() => setCategoryFilter('personal')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          categoryFilter === 'personal'
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                        }`}
                      >
                        <span>✨</span> Personal
                      </button>
                      <button
                        onClick={() => setCategoryFilter('household')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          categoryFilter === 'household'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/20'
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
                        className={`w-20 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${
                          priorityFilter === 'all'
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setPriorityFilter('urgent')}
                        className={`w-24 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          priorityFilter === 'urgent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`}
                      >
                        🔴 Urgent
                      </button>
                      <button
                        onClick={() => setPriorityFilter('high')}
                        className={`w-20 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          priorityFilter === 'high'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                        }`}
                      >
                        🟠 High
                      </button>
                      <button
                        onClick={() => setPriorityFilter('medium')}
                        className={`w-24 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          priorityFilter === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                        }`}
                      >
                        🟡 Medium
                      </button>
                      <button
                        onClick={() => setPriorityFilter('low')}
                        className={`w-16 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          priorityFilter === 'low'
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        ⚪ Low
                      </button>
                    </div>
                  </div>
                </div>
              </div>

          {/* Reminders List */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* Header with Month Badge and Filters - Now with filters on the right */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              {/* Left side: Title and month badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Reminders ({filteredReminders.length})
                </h2>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
                {selectionMode && filteredReminders.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 md:px-3 md:py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors min-h-[44px] md:min-h-0"
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
                        ? 'bg-gradient-reminders text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('mine')}
                    className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'mine'
                        ? 'bg-gradient-reminders text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    My Reminders
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('unassigned')}
                    className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                      assignmentFilter === 'unassigned'
                        ? 'bg-gradient-reminders text-white shadow-md'
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
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all'
                      ? 'bg-gradient-reminders text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active'
                      ? 'bg-gradient-reminders text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('snoozed')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[70px] ${
                    statusFilter === 'snoozed'
                      ? 'bg-gradient-reminders text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  Snoozed
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                    statusFilter === 'completed'
                      ? 'bg-gradient-reminders text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
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
                    <CTAButton
                      onClick={handleOpenModal}
                      feature="reminders"
                      icon={<Plus className="w-5 h-5" />}
                    >
                      Create Reminder
                    </CTAButton>
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
                        className="px-6 py-3 bg-gradient-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-md inline-flex items-center gap-2 font-medium"
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
                className="w-full px-4 py-2 bg-gradient-reminders text-white rounded-lg hover:opacity-90 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}
      </PageErrorBoundary>

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
