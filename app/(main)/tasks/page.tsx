'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, Home, Filter, Download, Repeat, FileText, Zap, TrendingUp, TrendingDown, Minus, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { TaskCard } from '@/components/tasks/TaskCard';
import { DraggableItemList } from '@/components/tasks/DraggableItemList';
import { UnifiedItemModal } from '@/components/shared/UnifiedItemModal';
import { UnifiedDetailsModal } from '@/components/shared/UnifiedDetailsModal';
import GuidedTaskCreation from '@/components/guided/GuidedTaskCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { tasksService } from '@/lib/services/tasks-service';
import { choresService, CreateChoreInput } from '@/lib/services/chores-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { Task, Chore } from '@/lib/types';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task-schemas';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { useChoreRealtime } from '@/hooks/useChoreRealtime';
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
import { TaskCardSkeleton } from '@/components/ui/Skeleton';

type TaskType = 'task' | 'chore';
type TaskOrChore = (Task & { type: 'task' }) | (Chore & { type: 'chore' });

export default function TasksPage() {
  const { currentSpace, user } = useAuth();

  // Basic state
  const [loading, setLoading] = useState(true);
  const [choreLoading, setChoreLoading] = useState(false);

  // Individual item loading states
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, {
    updating?: boolean;
    deleting?: boolean;
    statusChanging?: boolean;
  }>>({});
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

  // Real-time tasks with filters (only when currentSpace exists)
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks, setTasks } = useTaskRealtime({
    spaceId: currentSpace?.id || 'skip', // Use 'skip' to prevent database calls
    filters: {
      status: filters.status,
      priority: filters.priority,
      assignedTo: filters.assignees?.[0], // Take first assignee for simplicity
      // Exclude frequency and other chore-specific filters
    },
    onTaskAdded: (task) => console.log('Task added:', task.title),
    onTaskUpdated: (task) => console.log('Task updated:', task.title),
    onTaskDeleted: (taskId) => console.log('Task deleted:', taskId),
  });

  // Real-time chores with enhanced filters
  const { chores: realtimeChores, loading: choreRealtimeLoading, refreshChores, setChores } = useChoreRealtime({
    spaceId: currentSpace?.id || 'skip', // Use 'skip' to prevent database calls
    filters: {
      status: filters.status,
      frequency: filters.frequency, // Add frequency filter for chores
      // Map task filters to chore equivalents
      assignedTo: filters.assignees?.[0], // Take first assignee for simplicity
      search: filters.search, // Add search filter at hook level
    },
    onChoreAdded: (chore) => console.log('Chore added:', chore.title),
    onChoreUpdated: (chore) => console.log('Chore updated:', chore.title),
    onChoreDeleted: (choreId) => console.log('Chore deleted:', choreId),
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

    // Enhanced search filter - includes type-specific fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
  }, [allItems, statusFilter, searchQuery, filters]);

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
      // Chores are now handled by useChoreRealtime hook

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
            chores.length === 0 &&
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
    console.log('=== ENHANCED DEBUG LOGGING - PHASE 1.2 ===');
    console.log('🎯 handleSaveItem called with:', JSON.stringify(itemData, null, 2));
    console.log('📝 editingItem:', editingItem);
    console.log('🎛️ modalDefaultType:', modalDefaultType);
    console.log('🏠 currentSpace:', currentSpace?.id);
    console.log('👤 user:', user?.id);

    try {
      if (editingItem) {
        // Update existing item
        if (editingItem.type === 'task') {
          await tasksService.updateTask(editingItem.id, itemData as UpdateTaskInput);
        } else {
          await choresService.updateChore(editingItem.id, itemData as CreateChoreInput);
        }
        // Real-time subscription will handle the update
      } else {
        // Create new item with optimistic updates
        if (modalDefaultType === 'task') {
          // Optimistic update - add to UI immediately
          const taskData = itemData as CreateTaskInput;
          const optimisticTask: Task = {
            id: `temp-${Date.now()}`, // Temporary ID
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
            // Create task on server
            await tasksService.createTask(itemData as CreateTaskInput);
            // Real-time subscription will replace the optimistic task with the real one
          } catch (error) {
            // Revert optimistic update on error
            setTasks(prev => prev.filter(task => task.id !== optimisticTask.id));
            throw error;
          }
        } else {
          // Optimistic update for chores - add to UI immediately
          const choreData = itemData as CreateChoreInput;
          const optimisticChore: Chore = {
            id: `temp-${Date.now()}`, // Temporary ID
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
            // Create chore on server
            await choresService.createChore(itemData as CreateChoreInput);
            // Real-time subscription will replace the optimistic chore with the real one
          } catch (error) {
            // Revert optimistic update on error
            setChores(prev => prev.filter(chore => chore.id !== optimisticChore.id));
            throw error;
          }
        }
      }
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);

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

      // TODO: Replace with actual toast notification system
      console.warn('USER ERROR:', errorMessage);

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
          // Update on server
          const updateData: any = { status };
          if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }
          await choresService.updateChore(itemId, updateData);
          // Real-time subscription will handle the final sync
        } catch (error) {
          // Revert optimistic update on error - real-time will handle sync
          refreshChores();
          throw error;
        }
      } else {
        // Optimistic update for tasks - update UI immediately
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === itemId
              ? {
                  ...task,
                  status: status as any,
                  updated_at: new Date().toISOString()
                }
              : task
          )
        );

        try {
          // Update on server
          await tasksService.updateTask(itemId, { status });
          // Real-time subscription will handle the final sync
        } catch (error) {
          // Revert optimistic update on error
          refreshTasks();
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to update item status:', error);

      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to update status. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          errorMessage = 'You do not have permission to update this item.';
        }
      }

      // TODO: Replace with actual toast notification system
      console.warn('USER ERROR:', errorMessage);

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
  }, [currentSpace, setTasks, setChores, refreshTasks, refreshChores]);

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
      console.error(`Failed to delete ${type || 'task'}:`, error);

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

      // TODO: Replace with actual toast notification system
      console.warn('USER ERROR:', errorMessage);

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
      <PageErrorBoundary>
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
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
                      <select
                        id="status-filter-tasks-mobile"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full max-w-xs pl-10 pr-12 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white font-medium appearance-none cursor-pointer mb-3 flex items-center"
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
                  /* Unified drag-and-drop for all items with scrollbar */
                  <div className="space-y-4">
                    <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      <DraggableItemList
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
      </PageErrorBoundary>

      {/* Unified Modals */}
      {user && (
        <>
          <UnifiedItemModal
            isOpen={isUnifiedModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveItem}
            editItem={editingItem}
            spaceId={currentSpace?.id}
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
