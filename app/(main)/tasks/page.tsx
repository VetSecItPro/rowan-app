'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, Home, Filter, Download, Repeat, FileText, Zap, TrendingUp, TrendingDown, Minus, ChevronDown, X } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { tasksService } from '@/lib/services/tasks-service';
import { taskTemplatesService } from '@/lib/services/task-templates-service';
import { choresService, CreateChoreInput } from '@/lib/services/chores-service';
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
import { Tooltip } from '@/components/ui/Tooltip';
import { pointsService } from '@/lib/services/rewards';
import { logger } from '@/lib/logger';

type TaskType = 'task' | 'chore';
type TaskOrChore = (Task & { type: 'task' }) | (Chore & { type: 'chore' });

export default function TasksPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  // Basic state
  const [loading, setLoading] = useState(true);
  const [choreLoading, setChoreLoading] = useState(false);
  const [mobileStatsCollapsed, setMobileStatsCollapsed] = useState(true); // Collapsed by default on mobile

  // Individual item loading states
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, {
    updating?: boolean;
    deleting?: boolean;
    statusChanging?: boolean;
  }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search for 300ms
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  // Removed activeTab state - now showing all items together
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

  // Real-time tasks with filters (only when currentSpace exists)
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks, setTasks } = useTaskRealtime({
    spaceId: spaceId || '',
    filters: {
      status: filters.status,
      priority: filters.priority,
      assignedTo: filters.assignees?.[0], // Take first assignee for simplicity
      // Exclude frequency and other chore-specific filters
    },
    onTaskAdded: (task) => {}, // Silently handle - real-time updates shown via UI
    onTaskUpdated: (task) => {}, // Silently handle - real-time updates shown via UI
    onTaskDeleted: (taskId) => {}, // Silently handle - real-time updates shown via UI
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
    onChoreAdded: (chore) => {}, // Silently handle - real-time updates shown via UI
    onChoreUpdated: (chore) => {}, // Silently handle - real-time updates shown via UI
    onChoreDeleted: (choreId) => {}, // Silently handle - real-time updates shown via UI
  });

  // Always use realtime data
  const tasks = realtimeTasks;
  const chores = realtimeChores;

  // Combine tasks and chores for unified display
  const allItems = useMemo((): TaskOrChore[] => {
    const tasksWithType = tasks.map(t => ({ ...t, type: 'task' as const }));
    // Add missing fields for chores to match TaskCard expectations
    const choresWithType = chores.map((c, index) => ({
      ...c,
      type: 'chore' as const,
      priority: 'medium' as const, // Default priority for chores
      category: 'household' as const, // Default category for chores
      sort_order: c.sort_order ?? (1000 + index) // Default sort order for chores
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
  }, [currentSpace, user]);

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
            category: (taskData as any).category || undefined,
            due_date: taskData.due_date || undefined,
            tags: (taskData as any).tags,
            estimated_hours: (taskData as any).estimated_hours,
            priority: taskData.priority || 'medium',
            calendar_sync: (taskData as any).calendar_sync || false,
            quick_note: (taskData as any).quick_note,
            created_by: (taskData as any).created_by || user?.id || '',
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

      // Enhanced error handling with user-friendly messages
      let errorMessage = `Failed to ${editingItem ? 'update' : 'create'} ${modalDefaultType}. Please try again.`;
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          errorMessage = 'Please check that all required fields are filled correctly.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = `A ${modalDefaultType} with this name already exists.`;
        }
      }

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
  }, [editingItem, modalDefaultType, setTasks, setChores, user, currentSpace, refreshChores, refreshTasks, setChoreLoading]);

  const handleStatusChange = useCallback(async (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => {
    // Set loading state for this specific item
    setItemLoadingStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], statusChanging: true }
    }));

    try {
      if (type === 'chore') {
        // Optimistic update for chores - update UI immediately
        setChores(prevChores =>
          prevChores.map(chore =>
            chore.id === itemId
              ? {
                  ...chore,
                  status: status as any,
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
            const updateData: any = { status };
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
                  status: status as any,
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

      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to update status. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'You do not have permission to update this item.';
        }
      }

      // TODO: Replace with actual toast notification system (user-facing error shown via UI)

      // Additional recovery for chores
      if (type === 'chore') {
        // Force refresh chores on error to ensure consistency
        refreshChores();
      }
    } finally {
      // Clear loading state for this item
      setItemLoadingStates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], statusChanging: false }
      }));
    }
  }, [currentSpace, setTasks, setChores, refreshTasks, refreshChores, user, spaceId, tasks]);

  const handleDeleteItem = useCallback(async (itemId: string, type?: 'task' | 'chore') => {
    // Set loading state for this specific item
    setItemLoadingStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], deleting: true }
    }));

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

      // Show user-friendly error message
      let errorMessage = `Failed to delete ${type || 'task'}. Please try again.`;
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = `You do not have permission to delete this ${type || 'task'}.`;
        } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
          errorMessage = `Cannot delete ${type || 'task'} because it has dependencies. Please remove related items first.`;
        }
      }

      // TODO: Replace with actual toast notification system (user-facing error shown via UI)

      if (type === 'chore') {
        setChoreLoading(false);
        // Force refresh chores to ensure UI consistency
        refreshChores();
      } else {
        // Reload tasks to restore on error
        refreshTasks();
      }
    } finally {
      // Clear loading state for this item
      setItemLoadingStates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], deleting: false }
      }));
    }
  }, [setTasks, setChores, currentSpace, refreshTasks, refreshChores]);

  const handleEditItem = useCallback((item: TaskOrChore) => {
    setEditingItem({...item, type: item.type} as (Task & {type: 'task'}) | (Chore & {type: 'chore'}));
    setIsUnifiedModalOpen(true);
  }, []);

  const handleViewDetails = useCallback((item: TaskOrChore) => {
    setSelectedItem({...item, type: item.type} as (Task & {type: 'task'}) | (Chore & {type: 'chore'}));
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


  // Advanced feature handlers
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'repeat':
        // Recurring functionality is now integrated into UnifiedItemModal
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

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks & Chores' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadData}>
        <div className="min-h-full p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-tasks flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold bg-gradient-tasks bg-clip-text text-transparent">
                  Tasks & Chores
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Organize daily tasks and household chores together
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Points Display - Compact */}
              {user && spaceId && (
                <PointsDisplay
                  userId={user.id}
                  spaceId={spaceId}
                  variant="compact"
                  showStreak={true}
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenModal('task')}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm">New Task</span>
                </button>
                <button
                  onClick={() => handleOpenModal('chore')}
                  disabled={choreLoading}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {choreLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Home className="w-4 h-4" />
                  )}
                  <span className="text-sm">{choreLoading ? 'Creating...' : 'New Chore'}</span>
                </button>
                <button
                  onClick={() => setIsTemplatePickerOpen(true)}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  title="Create task from template"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Templates</span>
                </button>
              </div>
            </div>
          </div>


          {/* Stats Dashboard - Collapsible on mobile */}
          <div className="space-y-3">
            {/* Mobile toggle button - only visible on mobile */}
            <button
              onClick={() => setMobileStatsCollapsed(!mobileStatsCollapsed)}
              className="sm:hidden w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl active:scale-[0.98] transition-all"
              aria-expanded={!mobileStatsCollapsed}
              aria-label={mobileStatsCollapsed ? 'Expand Stats Overview' : 'Collapse Stats Overview'}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-tasks rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Stats Overview</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.pending} pending • {stats.inProgress} active • {stats.completed} done
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                    {mobileStatsCollapsed ? 'Tap to view all stats' : 'Tap to collapse'}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${mobileStatsCollapsed ? '' : 'rotate-180'}`} />
            </button>

            {/* Stats cards - hidden on mobile when collapsed, always visible on desktop */}
            <div className={`stats-grid-mobile gap-4 sm:gap-6 ${mobileStatsCollapsed ? 'hidden sm:grid' : 'grid'}`}>
              {/* Pending */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Pending</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  {stats.pending > 0 && (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs font-medium">To start</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                  {stats.inProgress > 0 && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
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
          </div>
          {/* Search Bar - Full Width (spans same width as stats cards above) */}
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
          {/* Tasks List */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar - Only show when filters are enabled */}
            {showFilters && currentSpace && (
              <div className="lg:col-span-1">
                <LazyTaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Main Content */}
            <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 relative" style={{zIndex: 'auto'}}>
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
                    {/* Custom Dropdown with Filter Icon */}
                    <Tooltip content="Filter tasks by completion status" position="bottom">
                      <div className="relative mb-3 max-w-xs">
                        <div className="relative">
                          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
                          <Dropdown
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value || 'all')}
                            options={[
                              { value: 'all', label: 'All Tasks & Chores' },
                              { value: 'pending', label: 'Pending' },
                              { value: 'in_progress', label: 'In Progress' },
                              { value: 'completed', label: 'Completed' }
                            ]}
                            placeholder="Filter by status..."
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </Tooltip>

                  </div>
                </div>

                {loading || realtimeLoading || choreLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <TaskCardSkeleton key={i} />
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
                      </div>
                    )}
                  </div>
                ) : enableDragDrop && currentSpace ? (
                  /* Unified drag-and-drop for all items with scrollbar */
                  <div className="space-y-4">
                    <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      <LazyDraggableItemList
                        spaceId={currentSpace.id}
                        initialItems={paginatedItems as any}
                        onStatusChange={handleStatusChange}
                        onEdit={handleEditItem as any}
                        onDelete={handleDeleteItem}
                        onViewDetails={handleViewDetails as any}
                      />
                    </div>

                    {/* Pagination Controls for Drag-and-Drop Mode */}
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
                ) : (
                  /* Regular list when drag-drop disabled */
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
                        onSaveAsTemplate={handleSaveAsTemplate}
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
                onEdit={handleEditItem as any}
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
