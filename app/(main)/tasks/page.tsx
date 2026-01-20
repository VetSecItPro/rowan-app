'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, Home, FileText, TrendingUp, Minus, ChevronDown, X } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { tasksService } from '@/lib/services/tasks-service';
import { taskTemplatesService } from '@/lib/services/task-templates-service';
import { choresService, CreateChoreInput, type UpdateChoreInput } from '@/lib/services/chores-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { Task, Chore } from '@/lib/types';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task-schemas';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { useChoreRealtime } from '@/hooks/useChoreRealtime';
import { TaskFilters } from '@/components/tasks/TaskFilterPanel';
import { Dropdown } from '@/components/ui/Dropdown';
import { TaskCardSkeleton } from '@/components/ui/Skeleton';
// Lazy-loaded components for better initial page load
import {
  LazyUnifiedItemModal,
  LazyUnifiedDetailsModal,
  LazyTaskFilterPanel,
  LazyBulkActionsBar,
  LazyTaskTemplatePickerModal,
  LazyDraggableItemList,
} from '@/lib/utils/lazy-components';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { PointsDisplay } from '@/components/rewards';
import { pointsService } from '@/lib/services/rewards';
import { logger } from '@/lib/logger';

type LinkedShoppingListMap = Awaited<ReturnType<typeof shoppingIntegrationService.getShoppingListsForTasks>>;
type TaskOrChore = Task & {
  type: 'task' | 'chore';
  frequency?: Chore['frequency'];
  notes?: Chore['notes'];
  sort_order: number;
};

export default function TasksPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  // Basic state
  const [loading, setLoading] = useState(true);
  const [choreLoading, setChoreLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search for 300ms
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  // Removed activeTab state - now showing all items together
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<LinkedShoppingListMap>({});

  // Unified modal state (replacing separate task/chore modals)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'task' | 'chore'>('task');
  const [editingItem, setEditingItem] = useState<TaskOrChore | null>(null);

  // Unified details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskOrChore | null>(null);

  // Advanced features state
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const showFilters = false;
  const enableDragDrop = true;

  // Remaining modal states for features not yet unified
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(20);
  const ITEMS_PER_PAGE = 20;

  // Real-time tasks with filters (only when currentSpace exists)
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks, setTasks } = useTaskRealtime({
    spaceId: spaceId || '',
    filters: {
      status: filters.status,
      priority: filters.priority,
      assignedTo: filters.assignees?.[0], // Take first assignee for simplicity
      // Exclude frequency and other chore-specific filters
    },
    onTaskAdded: () => {}, // Silently handle - real-time updates shown via UI
    onTaskUpdated: () => {}, // Silently handle - real-time updates shown via UI
    onTaskDeleted: () => {}, // Silently handle - real-time updates shown via UI
  });

  // Real-time chores with enhanced filters
  const { chores: realtimeChores, loading: choreRealtimeLoading, refreshChores, setChores } = useChoreRealtime({
    spaceId: spaceId || '',
    filters: {
      status: filters.status,
      frequency: filters.frequency, // Add frequency filter for chores
      // Map task filters to chore equivalents
      assignedTo: filters.assignees?.[0], // Take first assignee for simplicity
      search: filters.search, // Add search filter at hook level
    },
    onChoreAdded: () => {}, // Silently handle - real-time updates shown via UI
    onChoreUpdated: () => {}, // Silently handle - real-time updates shown via UI
    onChoreDeleted: () => {}, // Silently handle - real-time updates shown via UI
  });

  // Always use realtime data
  const tasks = realtimeTasks;
  const chores = realtimeChores;

  // Combine tasks and chores for unified display
  const allItems = useMemo((): TaskOrChore[] => {
    const tasksWithType = tasks.map((task, index) => ({
      ...task,
      type: 'task' as const,
      sort_order: task.sort_order ?? 1000 + index,
    }));
    // Add missing fields for chores to match TaskCard expectations
    const choresWithType = chores.map((chore, index) => ({
      ...chore,
      type: 'chore' as const,
      priority: 'medium' as const, // Default priority for chores
      category: 'household' as const, // Default category for chores
      sort_order: chore.sort_order ?? (2000 + index + tasks.length) // Default sort order for chores
    }));
    return [...tasksWithType, ...choresWithType];
  }, [tasks, chores]);

  // Memoized stats - calculate from combined items with all status types
  const stats = useMemo(() => ({
    total: allItems.length,
    pending: allItems.filter(item => item.status === 'pending').length,
    inProgress: allItems.filter(item => item.status === 'in-progress').length,
    blocked: allItems.filter(item => item.status === 'blocked').length,
    completed: allItems.filter(item => item.status === 'completed').length,
    // Active items = everything except completed
    active: allItems.filter(item => item.status !== 'completed').length,
  }), [allItems]);

  // Memoized filtered items - show all tasks and chores together with enhanced filtering
  const filteredItems = useMemo(() => {
    // Start with all items
    let filtered = allItems;

    // Auto-hide completed items from main view (unless explicitly viewing completed)
    if (statusFilter !== 'completed') {
      filtered = filtered.filter(item => item.status !== 'completed');
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Enhanced search filter - includes type-specific fields (uses debounced value)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        // Common fields for both tasks and chores
        const matchesCommon =
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query);

        // Type-specific search enhancements
        if (item.type === 'chore') {
          const chore = item as (Chore & { type: 'chore' });
          const matchesChoreFields =
            chore.frequency?.toLowerCase().includes(query) ||
            chore.notes?.toLowerCase().includes(query);
          return matchesCommon || matchesChoreFields;
        } else {
          const task = item as (Task & { type: 'task' });
          const matchesTaskFields =
            task.category?.toLowerCase().includes(query) ||
            task.tags?.toLowerCase().includes(query) ||
            task.quick_note?.toLowerCase().includes(query);
          return matchesCommon || matchesTaskFields;
        }
      });
    }

    // Type filter (from advanced filters)
    if (filters.itemType) {
      filtered = filtered.filter(item => item.type === filters.itemType);
    }

    // Frequency filter for chores (from advanced filters)
    if (filters.frequency) {
      filtered = filtered.filter(item => {
        if (item.type === 'chore') {
          const chore = item as (Chore & { type: 'chore' });
          return filters.frequency?.includes(chore.frequency) ?? true;
        }
        return true; // Tasks don't have frequency, so include them when frequency filter is active
      });
    }

    return filtered;
  }, [allItems, statusFilter, debouncedSearchQuery, filters]);

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
  }, [statusFilter, debouncedSearchQuery, ITEMS_PER_PAGE]);

  // Memoized loadData function to fetch both tasks and chores
  const loadData = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Chores are now handled by useChoreRealtime hook

      // Get tasks from realtime hook for shopping list integration
      const tasksData = realtimeTasks;

      // Load linked shopping lists for all tasks in a single batch query
      // This replaces N individual queries with 1 query
      try {
        const taskIds = tasksData.map(task => task.id);
        const linkedListsMap = await shoppingIntegrationService.getShoppingListsForTasks(taskIds);
        setLinkedShoppingLists(linkedListsMap);
      } catch (error) {
        logger.error('Failed to load shopping lists for tasks', error, { component: 'page', action: 'load_shopping_lists' });
        setLinkedShoppingLists({});
      }

    } catch (error) {
      logger.error('Failed to load data', error, { component: 'page', action: 'load_data' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, realtimeTasks, user]);

  // Load tasks when currentSpace.id changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unified modal handlers
  const handleSaveItem = useCallback(async (itemData: CreateTaskInput | CreateChoreInput): Promise<void | { id: string }> => {
    // Debug logging removed - rely on structured logger for errors only

    try {
      if (editingItem) {
        // Update existing item
        if (editingItem.type === 'task') {
          await tasksService.updateTask(editingItem.id, itemData as UpdateTaskInput);
        } else {
          await choresService.updateChore(editingItem.id, itemData as CreateChoreInput);
        }
        // Real-time subscription will handle the update
        setEditingItem(null);
        return; // Return void for updates
      } else {
        // Create new item with optimistic updates
        if (modalDefaultType === 'task') {
          // Optimistic update - add to UI immediately
          const taskData = itemData as CreateTaskInput;
          const tempId = `temp-${Date.now()}`;
          const optimisticTask: Task = {
            id: tempId, // Temporary ID
            title: taskData.title,
            status: taskData.status || 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            space_id: taskData.space_id,
            assigned_to: taskData.assigned_to || undefined,
            description: taskData.description || undefined,
            category: taskData.category || undefined,
            due_date: taskData.due_date || undefined,
            tags: taskData.tags ?? undefined,
            estimated_hours: taskData.estimated_hours,
            priority: taskData.priority || 'medium',
            calendar_sync: taskData.calendar_sync ?? false,
            quick_note: taskData.quick_note,
            created_by: taskData.created_by ?? user?.id ?? '',
            sort_order: Date.now(), // Use timestamp for unique sort order
          };

          setTasks(prev => [optimisticTask, ...prev]);

          try {
            // Create task on server and get the real task back
            const createdTask = await tasksService.createTask(itemData as CreateTaskInput);

            // Immediately replace the optimistic task with the real one from database
            setTasks(prev => prev.map(task =>
              task.id === tempId ? createdTask : task
            ));

            return { id: createdTask.id }; // Return real ID to caller
          } catch (error) {
            // Revert optimistic update on error
            setTasks(prev => prev.filter(task => task.id !== tempId));
            logger.error('Failed to create task', error, { component: 'page', action: 'create_task' });
            throw error;
          }
        } else {
          // Optimistic update for chores - add to UI immediately
          const choreData = itemData as CreateChoreInput;
          const tempId = `temp-${Date.now()}`;
          const optimisticChore: Chore = {
            id: tempId, // Temporary ID
            title: choreData.title,
            status: choreData.status || 'pending',
            frequency: choreData.frequency,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            space_id: choreData.space_id,
            assigned_to: choreData.assigned_to || undefined,
            description: choreData.description || undefined,
            due_date: choreData.due_date || undefined,
            created_by: choreData.created_by,
            sort_order: Date.now(), // Use timestamp for unique sort order
          };

          setChores(prev => [optimisticChore, ...prev]);

          try {
            // Create chore on server and get the real chore back
            const createdChore = await choresService.createChore(itemData as CreateChoreInput);

            // Immediately replace the optimistic chore with the real one from database
            setChores(prev => prev.map(chore =>
              chore.id === tempId ? createdChore : chore
            ));

            return { id: createdChore.id }; // Return real ID to caller
          } catch (error) {
            // Revert optimistic update on error
            setChores(prev => prev.filter(chore => chore.id !== tempId));
            logger.error('Failed to create chore', error, { component: 'page', action: 'create_chore' });
            throw error;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to save item', error, { component: 'page', action: 'save_item', itemType: modalDefaultType });

      // TODO: Replace with actual toast notification system (user-facing error shown via UI)

      // Additional recovery actions
      if (modalDefaultType === 'chore') {
        // Reset chore loading state if still set
        setChoreLoading(false);
        // Refresh chores to ensure consistency
        refreshChores();
      } else {
        // Refresh tasks to ensure consistency
        refreshTasks();
      }
    }
  }, [editingItem, modalDefaultType, refreshChores, refreshTasks, setChoreLoading, setChores, setTasks, user]);

  const handleStatusChange = useCallback(async (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => {
    try {
      if (type === 'chore') {
        // Optimistic update for chores - update UI immediately
        setChores(prevChores =>
          prevChores.map(chore =>
            chore.id === itemId
              ? {
                  ...chore,
                  status,
                  completed_at: status === 'completed' ? new Date().toISOString() : chore.completed_at,
                  updated_at: new Date().toISOString()
                }
              : chore
          )
        );

        try {
          // If completing, use the rewards-enabled method
          if (status === 'completed' && user) {
            const result = await choresService.completeChoreWithRewards(itemId, user.id);
            // Show points earned notification (if points were awarded)
            // TODO: Show toast notification with points earned
            if (result.pointsAwarded > 0) {
              // Points awarded successfully - UI will be updated via real-time subscription
            }
          } else {
            // For other status changes, use regular update
            const updateData: UpdateChoreInput = { status };
            if (status === 'completed') {
              updateData.completed_at = new Date().toISOString();
            }
            await choresService.updateChore(itemId, updateData);
          }
          // Real-time subscription will handle the final sync
        } catch (error) {
          // Revert optimistic update on error - real-time will handle sync
          refreshChores();
          throw error;
        }
      } else {
        // Get the task title for points awarding
        const task = tasks.find(t => t.id === itemId);

        // Optimistic update for tasks - update UI immediately
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === itemId
              ? {
                  ...t,
                  status,
                  updated_at: new Date().toISOString()
                }
              : t
          )
        );

        try {
          // Update on server
          await tasksService.updateTask(itemId, { status });

          // Award points for completing tasks
          if (status === 'completed' && user && spaceId && task) {
            try {
              await pointsService.awardTaskPoints(user.id, spaceId, itemId, task.title);
              // TODO: Show toast notification with points earned
            } catch (pointsError) {
              // Points failed but task is still completed - don't fail the whole operation
              logger.error('Failed to award points for task', pointsError, { component: 'page', action: 'award_points' });
            }
          }
          // Real-time subscription will handle the final sync
        } catch (error) {
          // Revert optimistic update on error
          refreshTasks();
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to update item status', error, { component: 'page', action: 'update_status', itemId });

      // TODO: Replace with actual toast notification system (user-facing error shown via UI)

      // Additional recovery for chores
      if (type === 'chore') {
        // Force refresh chores on error to ensure consistency
        refreshChores();
      }
    }
  }, [refreshChores, refreshTasks, setChores, setTasks, spaceId, tasks, user]);

  const handleDeleteItem = useCallback(async (itemId: string, type?: 'task' | 'chore') => {
    try {
      if (type === 'chore') {
        setChoreLoading(true);
        await choresService.deleteChore(itemId);
        // Real-time subscription will handle the chore removal
        setChoreLoading(false);
      } else {
        // Optimistic update for tasks (real-time will handle the actual removal)
        setTasks(prev => prev.filter(task => task.id !== itemId));
        await tasksService.deleteTask(itemId);
      }
    } catch (error) {
      logger.error(`Failed to delete ${type || 'task'}`, error, { component: 'page', action: 'delete_item', itemId, type });

      // TODO: Replace with actual toast notification system (user-facing error shown via UI)

      if (type === 'chore') {
        setChoreLoading(false);
        // Force refresh chores to ensure UI consistency
        refreshChores();
      } else {
        // Reload tasks to restore on error
        refreshTasks();
      }
    }
  }, [refreshChores, refreshTasks, setChoreLoading, setTasks]);

  const handleEditItem = useCallback((item: TaskOrChore) => {
    setEditingItem({ ...item, type: item.type });
    setIsUnifiedModalOpen(true);
  }, []);

  const handleViewDetails = useCallback((item: TaskOrChore) => {
    setSelectedItem({ ...item, type: item.type });
    setIsDetailsModalOpen(true);
  }, []);

  const handleSaveAsTemplate = useCallback(async (item: Task & { type?: 'task' | 'chore' }) => {
    if (item.type !== 'task' || !currentSpace || !user) return;

    try {
      await taskTemplatesService.createFromTask(item.id, `${item.title} Template`, user.id);
      // Could show a success toast here
    } catch (error) {
      logger.error('Failed to save task as template', error, {
        component: 'tasks-page',
        action: 'save_as_template',
        taskId: item.id
      });
    }
  }, [currentSpace, user]);

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


  const handleOpenModal = useCallback((type: 'task' | 'chore') => {
    setModalDefaultType(type);
    setIsUnifiedModalOpen(true);
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    setSelectedTaskIds([]);
    refreshTasks();
    loadData();
  }, [refreshTasks, loadData]);

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks & Chores' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadData}>
        <div className="min-h-full p-3 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {/* Header - Compact on Mobile */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Title Row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-tasks flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-3xl lg:text-4xl font-bold bg-gradient-tasks bg-clip-text text-transparent">
                  Tasks & Chores
                </h1>
                <p className="text-xs sm:text-base text-gray-400 hidden sm:block">
                  Organize daily tasks and household chores together
                </p>
              </div>
            </div>

            {/* Action Row - Points + Buttons all on one line on mobile */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
              {/* Points Display - Compact */}
              {user && spaceId && (
                <PointsDisplay
                  userId={user.id}
                  spaceId={spaceId}
                  variant="compact"
                  showStreak={false}
                />
              )}

              {/* Pill-shaped action buttons */}
              <button
                onClick={() => handleOpenModal('task')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New Task</span>
              </button>
              <button
                onClick={() => handleOpenModal('chore')}
                disabled={choreLoading}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50"
              >
                {choreLoading ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span>{choreLoading ? '...' : 'New Chore'}</span>
              </button>
              <button
                onClick={() => setIsTemplatePickerOpen(true)}
                className="p-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium flex-shrink-0"
                title="Create task from template"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>
          </div>


          {/* Stats Dashboard - Hidden on mobile */}
          <div className="hidden sm:block">
            {/* Stats cards - only visible on desktop */}
            <div className="stats-grid-mobile gap-4 sm:gap-6 grid">
              {/* Pending */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Pending</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.pending}</p>
                  {stats.pending > 0 && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs font-medium">To start</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.inProgress}</p>
                  {stats.inProgress > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.completed}</p>
                  {stats.total > 0 && (
                    <div className="flex items-center gap-1 text-green-400">
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
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Total Tasks & Chores</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-tasks rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
                  {stats.total > 0 && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Minus className="w-3 h-3" />
                      <span className="text-xs font-medium">Overall</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Search Bar - Compact on mobile */}
          <div className="w-full">
            <div className={`apple-search-container tasks-search group ${isSearchTyping ? 'apple-search-typing' : ''} !py-2 sm:!py-3`}>
              <Search className="apple-search-icon !w-4 !h-4 sm:!w-5 sm:!h-5" />
              <input
                type="search"
                placeholder="Search tasks and chores..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="apple-search-input !text-sm sm:!text-base"
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
          {/* Tasks List - Fill remaining screen height on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 flex-1 min-h-0">
            {/* Filters Sidebar - Only show when filters are enabled */}
            {showFilters && currentSpace && (
              <div className="lg:col-span-1">
                <LazyTaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Main Content - Stretch to bottom */}
            <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col min-h-0`}>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-2 sm:p-4 relative flex-1 flex flex-col min-h-[50vh] sm:min-h-0" style={{zIndex: 'auto'}}>
                {/* Compact Header with Status Filter */}
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs sm:text-base font-semibold text-white">
                      All Tasks & Chores
                    </h2>
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] font-medium rounded">
                      {filteredItems.length}
                    </span>
                  </div>

                  {/* Compact Status Filter */}
                  <Dropdown
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value || 'all')}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'in_progress', label: 'Active' },
                      { value: 'completed', label: 'Done' }
                    ]}
                    placeholder="Filter..."
                    className="text-xs max-w-[90px] sm:max-w-[120px]"
                  />
                </div>

                {loading || realtimeLoading || choreRealtimeLoading || choreLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <TaskCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <CheckSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-gray-400 text-sm sm:text-lg mb-1 sm:mb-2">No tasks or chores found</p>
                    <p className="text-gray-500 text-xs sm:text-base mb-4 sm:mb-6">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first task or chore to get started!'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <button
                        onClick={() => handleOpenModal('task')}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Create Task or Chore
                      </button>
                    )}
                  </div>
                ) : enableDragDrop && currentSpace ? (
                  /* Unified drag-and-drop for all items with scrollbar */
                  <div className="space-y-2">
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      <LazyDraggableItemList
                        spaceId={currentSpace.id}
                        initialItems={paginatedItems}
                        onStatusChange={handleStatusChange}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                        onViewDetails={handleViewDetails}
                      />
                    </div>

                    {/* Pagination Controls for Drag-and-Drop Mode */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400">
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
                            className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Show All ({remainingItemsCount})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regular list when drag-drop disabled */
                  <div className="space-y-2">
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {paginatedItems.map((item) => (
                        <TaskCard
                          key={item.id}
                          task={item}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                          onViewDetails={handleViewDetails}
                          onSaveAsTemplate={handleSaveAsTemplate}
                          linkedShoppingList={item.type === 'task' ? linkedShoppingLists[item.id] : undefined}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400">
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
                            className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-2 font-medium"
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
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>

      {/* Unified Modals */}
      {user && (
        <>
          <LazyUnifiedItemModal
            isOpen={isUnifiedModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveItem}
            editItem={editingItem}
            spaceId={currentSpace?.id}
            userId={user.id}
            defaultType={modalDefaultType}
            mode={editingItem ? "quickEdit" : "create"}
          />

          {currentSpace && (
            <>
              <LazyUnifiedDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={handleCloseDetailsModal}
                item={selectedItem}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onSave={handleSaveItem}
                spaceId={currentSpace.id}
                userId={user.id}
              />

              {/* Advanced Feature Modals */}

              <LazyTaskTemplatePickerModal
                isOpen={isTemplatePickerOpen}
                onClose={() => setIsTemplatePickerOpen(false)}
                onSelect={async (templateId) => {
                  setIsTemplatePickerOpen(false);
                  try {
                    const newTask = await taskTemplatesService.createTaskFromTemplate(templateId);
                    if (newTask) {
                      // Refresh tasks to show the new task
                      refreshTasks();
                    }
                  } catch (error) {
                    logger.error('Failed to create task from template', error, {
                      component: 'tasks-page',
                      action: 'create_from_template',
                      templateId
                    });
                  }
                }}
                spaceId={currentSpace.id}
              />
            </>
          )}


        </>
      )}

      {/* Bulk Actions Bar */}
      {currentSpace && (
        <LazyBulkActionsBar
          selectedTaskIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onActionComplete={handleBulkActionComplete}
        />
      )}

    </FeatureLayout>
  );
}
