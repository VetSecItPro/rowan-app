import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { useChoreRealtime } from '@/hooks/useChoreRealtime';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { TaskFilters } from '@/components/tasks/TaskFilterPanel';
import type { Task, Chore } from '@/lib/types';
import type { TaskOrChore } from '@/lib/hooks/useTasksModals';
import { logger } from '@/lib/logger';

// =============================================
// TYPES
// =============================================

type LinkedShoppingListMap = Awaited<ReturnType<typeof shoppingIntegrationService.getShoppingListsForTasks>>;

export interface TasksStats {
  total: number;
  pending: number;
  inProgress: number;
  blocked: number;
  completed: number;
  active: number;
}

export interface TasksDataReturn {
  // Auth/space context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  spaceId: string | undefined;

  // Loading states
  loading: boolean;
  realtimeLoading: boolean;
  choreRealtimeLoading: boolean;
  choreLoading: boolean;
  setChoreLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Search & filter state
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearchQuery: string;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  filters: TaskFilters;
  setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>;

  // Feature flags
  showFilters: boolean;
  enableDragDrop: boolean;

  // Raw data
  tasks: Task[];
  chores: Chore[];

  // Realtime setters for optimistic updates
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>;

  // Refresh functions
  refreshTasks: () => void;
  refreshChores: () => void;

  // Computed data
  allItems: TaskOrChore[];
  stats: TasksStats;
  filteredItems: TaskOrChore[];
  paginatedItems: TaskOrChore[];
  hasMoreItems: boolean;
  remainingItemsCount: number;
  ITEMS_PER_PAGE: number;

  // Linked shopping lists
  linkedShoppingLists: LinkedShoppingListMap;

  // Pagination handlers
  handleLoadMore: () => void;
  handleShowAll: () => void;

  // Data loading
  loadData: () => Promise<void>;

  // Search handler
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// =============================================
// HOOK
// =============================================

/** Loads and manages task data with filtering, sorting, and real-time updates */
export function useTasksData(): TasksDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  // Basic state
  const [loading, setLoading] = useState(true);
  const [choreLoading, setChoreLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<LinkedShoppingListMap>({});

  // Advanced features state
  const [filters, setFilters] = useState<TaskFilters>({});
  const showFilters = false;
  const enableDragDrop = true;

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(20);
  const ITEMS_PER_PAGE = 20;

  // Real-time tasks with filters
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks, setTasks } = useTaskRealtime({
    spaceId: spaceId || '',
    filters: {
      status: filters.status,
      priority: filters.priority,
      assignedTo: filters.assignees?.[0],
    },
  });

  // Real-time chores with enhanced filters
  const { chores: realtimeChores, loading: choreRealtimeLoading, refreshChores, setChores } = useChoreRealtime({
    spaceId: spaceId || '',
    filters: {
      status: filters.status,
      frequency: filters.frequency,
      assignedTo: filters.assignees?.[0],
      search: filters.search,
    },
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
    const choresWithType = chores.map((chore, index) => ({
      ...chore,
      type: 'chore' as const,
      priority: 'medium' as const,
      category: 'household' as const,
      sort_order: chore.sort_order ?? (2000 + index + tasks.length)
    }));
    return [...tasksWithType, ...choresWithType];
  }, [tasks, chores]);

  // Memoized stats
  const stats = useMemo((): TasksStats => ({
    total: allItems.length,
    pending: allItems.filter(item => item.status === 'pending').length,
    inProgress: allItems.filter(item => item.status === 'in-progress').length,
    blocked: allItems.filter(item => item.status === 'blocked').length,
    completed: allItems.filter(item => item.status === 'completed').length,
    active: allItems.filter(item => item.status !== 'completed').length,
  }), [allItems]);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Auto-hide completed items from main view (unless explicitly viewing completed)
    if (statusFilter !== 'completed') {
      filtered = filtered.filter(item => item.status !== 'completed');
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Enhanced search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const matchesCommon =
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query);

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
        return true;
      });
    }

    return filtered;
  }, [allItems, statusFilter, debouncedSearchQuery, filters]);

  // Paginated items
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

  // Load data function
  const loadData = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const tasksData = realtimeTasks;

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

  // Search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      setIsSearchTyping(true);
      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchTyping(false);
    }
  }, []);

  return {
    currentSpace,
    user,
    spaceId,
    loading,
    realtimeLoading,
    choreRealtimeLoading,
    choreLoading,
    setChoreLoading,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearchTyping,
    setIsSearchTyping,
    statusFilter,
    setStatusFilter,
    filters,
    setFilters,
    showFilters,
    enableDragDrop,
    tasks,
    chores,
    setTasks,
    setChores,
    refreshTasks,
    refreshChores,
    allItems,
    stats,
    filteredItems,
    paginatedItems,
    hasMoreItems,
    remainingItemsCount,
    ITEMS_PER_PAGE,
    linkedShoppingLists,
    handleLoadMore,
    handleShowAll,
    loadData,
    handleSearchChange,
  };
}
