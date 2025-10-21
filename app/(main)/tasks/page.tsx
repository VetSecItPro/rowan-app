'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, Home, Filter, Download, Repeat, FileText, Zap, TrendingUp, TrendingDown, Minus, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';
import { UnifiedItemModal } from '@/components/shared/UnifiedItemModal';
import { UnifiedDetailsModal } from '@/components/shared/UnifiedDetailsModal';
import GuidedTaskCreation from '@/components/guided/GuidedTaskCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { tasksService } from '@/lib/services/tasks-service';
import { choresService, Chore, CreateChoreInput } from '@/lib/services/chores-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { Task, CreateTaskInput } from '@/lib/types';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { TaskFilterPanel, TaskFilters } from '@/components/tasks/TaskFilterPanel';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { TemplatePickerModal } from '@/components/tasks/TemplatePickerModal';
import { SnoozeModal } from '@/components/tasks/SnoozeModal';
import { SubtasksList } from '@/components/tasks/SubtasksList';
import { TimeTracker } from '@/components/tasks/TimeTracker';
import { TaskComments } from '@/components/tasks/TaskComments';
import { TaskQuickActions } from '@/components/tasks/TaskQuickActions';
import { CalendarSyncToggle } from '@/components/tasks/CalendarSyncToggle';
import { ChoreRotationConfig } from '@/components/tasks/ChoreRotationConfig';

type TaskType = 'task' | 'chore';
type TaskOrChore = (Task & { type: 'task' }) | (Chore & { type: 'chore' });

export default function TasksPage() {
  const { currentSpace, user } = useAuth();

  // Basic state
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  // Removed activeTab state - now showing all items together
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<Record<string, any>>({});

  // Unified modal state (replacing separate task/chore modals)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'task' | 'chore'>('task');
  const [editingItem, setEditingItem] = useState<(Task & {type: 'task'}) | (Chore & {type: 'chore'}) | null>(null);

  // Unified details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Task & {type: 'task'}) | (Chore & {type: 'chore'}) | null>(null);

  // Advanced features state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [enableDragDrop, setEnableDragDrop] = useState(true);

  // Remaining modal states for features not yet unified
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(20);
  const ITEMS_PER_PAGE = 20;

  // Real-time tasks with filters (always enabled now)
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks } = useTaskRealtime({
    spaceId: currentSpace?.id || '',
    filters: filters,
    onTaskAdded: (task) => console.log('Task added:', task.title),
    onTaskUpdated: (task) => console.log('Task updated:', task.title),
    onTaskDeleted: (taskId) => console.log('Task deleted:', taskId),
  });

  // Always use realtime tasks
  const tasks = realtimeTasks;

  // Combine tasks and chores for unified display
  const allItems = useMemo((): TaskOrChore[] => {
    const tasksWithType = tasks.map(t => ({ ...t, type: 'task' as const }));
    const choresWithType = chores.map(c => ({ ...c, type: 'chore' as const }));
    return [...tasksWithType, ...choresWithType];
  }, [tasks, chores]);

  // Memoized stats - calculate from combined items
  const stats = useMemo(() => ({
    total: allItems.length,
    completed: allItems.filter(item => item.status === 'completed').length,
    inProgress: allItems.filter(item => item.status === 'in_progress' || item.status === 'pending').length,
    pending: allItems.filter(item => item.status === 'pending').length,
  }), [allItems]);

  // Memoized filtered items - show all tasks and chores together
  const filteredItems = useMemo(() => {
    // Start with all items (no tab filtering)
    let filtered = allItems;

    // Hide completed items by default
    filtered = filtered.filter(item => item.status !== 'completed');

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allItems, statusFilter, searchQuery]);

  // Paginated items for performance with large lists
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, displayLimit);
  }, [filteredItems, displayLimit]);

  const hasMoreItems = filteredItems.length > displayLimit;
  const remainingItemsCount = filteredItems.length - displayLimit;

  // Pagination handlers
  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + ITEMS_PER_PAGE);
  }, [ITEMS_PER_PAGE]);

  const handleShowAll = useCallback(() => {
    setDisplayLimit(filteredItems.length);
  }, [filteredItems.length]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [statusFilter, searchQuery, ITEMS_PER_PAGE]);

  // Memoized loadData function to fetch both tasks and chores
  const loadData = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch chores (tasks are handled by useTaskRealtime hook)
      const choresData = await choresService.getChores(currentSpace.id);
      setChores(choresData);

      // Get tasks from realtime hook for shopping list integration
      const tasksData = realtimeTasks;

      // Load linked shopping lists for tasks
      const linkedListsMap: Record<string, any> = {};
      await Promise.all(
        tasksData.map(async (task) => {
          try {
            const linkedLists = await shoppingIntegrationService.getShoppingListsForTask(task.id);
            if (linkedLists && linkedLists.length > 0) {
              linkedListsMap[task.id] = linkedLists[0]; // For now, just take the first linked list
            }
          } catch (error) {
            console.error(`Failed to load shopping list for task ${task.id}:`, error);
          }
        })
      );
      setLinkedShoppingLists(linkedListsMap);

      // Try to fetch user progress (non-blocking)
      try {
        const userProgressResult = await getUserProgress(user.id);
        if (userProgressResult.success && userProgressResult.data) {
          setHasCompletedGuide(userProgressResult.data.first_task_created);

          // Show guided flow if no tasks exist, user hasn't completed the guide, AND user hasn't skipped it
          if (
            tasksData.length === 0 &&
            choresData.length === 0 &&
            !userProgressResult.data.first_task_created &&
            !userProgressResult.data.skipped_task_guide
          ) {
            setShowGuidedFlow(true);
          }
        }
      } catch (progressError) {
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // Load tasks when currentSpace.id changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unified modal handlers
  const handleSaveItem = useCallback(async (itemData: CreateTaskInput | CreateChoreInput) => {
    try {
      if (editingItem) {
        // Update existing item
        if (editingItem.type === 'task') {
          await tasksService.updateTask(editingItem.id, itemData as CreateTaskInput);
        } else {
          await choresService.updateChore(editingItem.id, itemData as CreateChoreInput);
        }
      } else {
        // Create new item based on current modal type
        if (modalDefaultType === 'task') {
          await tasksService.createTask(itemData as CreateTaskInput);
        } else {
          await choresService.createChore(itemData as CreateChoreInput);
        }
      }
      loadData();
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  }, [editingItem, modalDefaultType, loadData]);

  const handleStatusChange = useCallback(async (itemId: string, status: string, type?: 'task' | 'chore') => {
    try {
      if (type === 'chore') {
        // When marking chore as completed, set completed_at timestamp
        const updateData: any = { status };
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
        await choresService.updateChore(itemId, updateData);
      } else {
        await tasksService.updateTask(itemId, { status });
      }
      loadData();
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  }, [loadData]);

  const handleDeleteItem = useCallback(async (itemId: string, type?: 'task' | 'chore') => {
    try {
      if (type === 'chore') {
        await choresService.deleteChore(itemId);
      } else {
        await tasksService.deleteTask(itemId);
      }
      loadData();
    } catch (error) {
      console.error(`Failed to delete ${type || 'task'}:`, error);
    }
  }, [loadData]);

  const handleEditItem = useCallback((item: TaskOrChore) => {
    setEditingItem({...item, type: item.type} as (Task & {type: 'task'}) | (Chore & {type: 'chore'}));
    setIsUnifiedModalOpen(true);
  }, []);

  const handleViewDetails = useCallback((item: TaskOrChore) => {
    setSelectedItem({...item, type: item.type} as (Task & {type: 'task'}) | (Chore & {type: 'chore'}));
    setIsDetailsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsUnifiedModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Handle typing animation
    if (value.length > 0) {
      setIsSearchTyping(true);
      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchTyping(false);
    }
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleOpenModal = useCallback((type: 'task' | 'chore') => {
    setModalDefaultType(type);
    setIsUnifiedModalOpen(true);
  }, []);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadData(); // Reload to show the newly created task
  }, [loadData]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'task_guide');
      } catch (error) {
        console.error('Failed to mark task guide as skipped:', error);
      }
    }
  }, [user]);

  // Advanced feature handlers
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'repeat':
        // Recurring functionality is now integrated into UnifiedItemModal
        setActiveTab('task');
        handleOpenModal('task');
        break;
      default:
        break;
    }
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    setSelectedTaskIds([]);
    refreshTasks();
    loadData();
  }, [refreshTasks, loadData]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks & Chores' }]}>
      <div className="min-h-full p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-tasks flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-tasks bg-clip-text text-transparent">
                  Tasks & Chores
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Organize daily tasks and household chores together
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal('task')}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm">New Task</span>
                </button>
                <button
                  onClick={() => handleOpenModal('chore')}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm">New Chore</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedTaskCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="stats-grid-mobile gap-4 sm:gap-6">
            {/* Pending */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Pending</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                {stats.pending > 0 && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Needs attention</span>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                {stats.inProgress > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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

            {/* Total Tasks & Chores */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Total Tasks & Chores</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-tasks rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Minus className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Search Bar - Full Width (spans same width as stats cards above) */}
          {!showGuidedFlow && (
          <div className="w-full">
            <div className={`apple-search-container tasks-search group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
              <Search className="apple-search-icon" />
              <input
                type="search"
                placeholder="Search tasks and chores..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="apple-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchTyping(false);
                  }}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          )}

          {/* Tasks List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar - Only show when filters are enabled */}
            {showFilters && currentSpace && (
              <div className="lg:col-span-1">
                <TaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Main Content */}
            <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
                {/* Header with Month Badge and Status Filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      All Tasks & Chores ({filteredItems.length})
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                      {format(new Date(), 'MMM yyyy')}
                    </span>
                  </div>

                  {/* Status Filter - Mobile Dropdown + Desktop Buttons */}
                  <div>
                    {/* Mobile: Dropdown Select */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                      <select
                        id="status-filter-tasks-mobile"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full max-w-xs pl-10 pr-10 py-3 text-base bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white font-medium appearance-none cursor-pointer mb-4"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em' }}
                      >
                        <option value="all">All Tasks & Chores</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    </div>

                    {/* Desktop: Clean Filter Buttons */}
                    <div className="hidden gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setStatusFilter(value)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            statusFilter === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loading || realtimeLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                            <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                          </div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2" />
                        <div className="flex items-center gap-2 mt-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No tasks or chores found</p>
                    <p className="text-gray-500 dark:text-gray-500 mb-6">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first task or chore to get started!'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => handleOpenModal('task')}
                          className="btn-touch bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Create Task or Chore
                        </button>
                        {!hasCompletedGuide && (
                          <button
                            onClick={() => setShowGuidedFlow(true)}
                            className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                          >
                            <CheckSquare className="w-5 h-5" />
                            Try Guided Creation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : enableDragDrop && currentSpace ? (
                  /* Drag-and-drop for tasks */
                  <DraggableTaskList
                    spaceId={currentSpace.id}
                    initialTasks={filteredItems.filter(item => item.type === 'task') as any}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditItem as any}
                    onDelete={handleDeleteItem}
                    onViewDetails={handleViewDetails as any}
                  />
                ) : (
                  /* Regular list for chores or when drag-drop disabled */
                  <div className="space-y-4">
                    <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {paginatedItems.map((item) => (
                        <TaskCard
                          key={item.id}
                        task={item as any}
                        onStatusChange={handleStatusChange as any}
                        onEdit={handleEditItem as any}
                        onDelete={handleDeleteItem}
                        onViewDetails={handleViewDetails as any}
                        linkedShoppingList={item.type === 'task' ? linkedShoppingLists[item.id] : undefined}
                      />
                    ))}
                    </div>

                    {/* Pagination Controls */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {paginatedItems.length} of {filteredItems.length} items
                          <span className="ml-1 text-gray-500">({remainingItemsCount} more)</span>
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleLoadMore}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Load {remainingItemsCount > ITEMS_PER_PAGE ? ITEMS_PER_PAGE : remainingItemsCount} More
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleShowAll}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Show All ({remainingItemsCount})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Unified Modals */}
      {currentSpace && user && (
        <>
          <UnifiedItemModal
            isOpen={isUnifiedModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveItem}
            editItem={editingItem}
            spaceId={currentSpace.id}
            userId={user.id}
            defaultType={modalDefaultType}
            mode={editingItem ? "quickEdit" : "create"}
          />

          <UnifiedDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={handleCloseDetailsModal}
            item={selectedItem}
            onEdit={handleEditItem as any}
            onDelete={handleDeleteItem}
            onSave={handleSaveItem}
            spaceId={currentSpace.id}
            userId={user.id}
          />

          {/* Advanced Feature Modals */}

          <TemplatePickerModal
            isOpen={isTemplatePickerOpen}
            onClose={() => setIsTemplatePickerOpen(false)}
            onSelect={(templateId) => {
              console.log('Selected template:', templateId);
              setIsTemplatePickerOpen(false);
              // TODO: Create task from template
            }}
            spaceId={currentSpace.id}
          />


        </>
      )}

      {/* Bulk Actions Bar */}
      {currentSpace && (
        <BulkActionsBar
          selectedTaskIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onActionComplete={handleBulkActionComplete}
        />
      )}

    </FeatureLayout>
  );
}
