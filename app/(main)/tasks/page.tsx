'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, Home, Filter, Download, Repeat, FileText, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { NewChoreModal } from '@/components/projects/NewChoreModal';
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
import { RecurringTaskModal } from '@/components/tasks/RecurringTaskModal';
import { TemplatePickerModal } from '@/components/tasks/TemplatePickerModal';
import { ExportModal } from '@/components/tasks/ExportModal';
import { AttachmentsModal } from '@/components/tasks/AttachmentsModal';
import { DependenciesModal } from '@/components/tasks/DependenciesModal';
import { ApprovalModal } from '@/components/tasks/ApprovalModal';
import { SnoozeModal } from '@/components/tasks/SnoozeModal';
import { SubtasksList } from '@/components/tasks/SubtasksList';
import { TimeTracker } from '@/components/tasks/TimeTracker';
import { TaskComments } from '@/components/tasks/TaskComments';
import { TaskQuickActions } from '@/components/tasks/TaskQuickActions';
import { CalendarSyncToggle } from '@/components/tasks/CalendarSyncToggle';
import { ChoreRotationConfig } from '@/components/tasks/ChoreRotationConfig';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

type TaskType = 'task' | 'chore';
type TaskOrChore = (Task & { type: 'task' }) | (Chore & { type: 'chore' });

export default function TasksPage() {
  const { currentSpace, user } = useAuth();

  // Basic state
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<TaskType>('task');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<Record<string, any>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'task' | 'chore' } | null>(null);

  // Advanced features state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [enableDragDrop, setEnableDragDrop] = useState(true);

  // Modal states for advanced features
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeDetailModal, setActiveDetailModal] = useState<
    'attachments' | 'dependencies' | 'approval' | 'snooze' | 'details' | null
  >(null);

  // Real-time tasks with filters (only for task tab, not chores)
  const { tasks: realtimeTasks, loading: realtimeLoading, refreshTasks } = useTaskRealtime({
    spaceId: currentSpace?.id || '',
    filters: activeTab === 'task' ? filters : {},
    onTaskAdded: (task) => console.log('Task added:', task.title),
    onTaskUpdated: (task) => console.log('Task updated:', task.title),
    onTaskDeleted: (taskId) => console.log('Task deleted:', taskId),
  });

  // Use realtime tasks when on task tab, otherwise use local state
  const tasks = activeTab === 'task' ? realtimeTasks : [];

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

  // Memoized filtered items - filter combined tasks and chores
  const filteredItems = useMemo(() => {
    // Filter by active tab first
    let filtered = allItems.filter(item => item.type === activeTab);

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
  }, [allItems, statusFilter, searchQuery, activeTab]);

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

  // Memoized handlers with useCallback
  const handleCreateTask = useCallback(async (taskData: CreateTaskInput) => {
    try {
      if (editingTask) {
        // Update existing task
        await tasksService.updateTask(editingTask.id, taskData);
      } else {
        // Create new task
        await tasksService.createTask(taskData);
      }
      loadData();
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  }, [editingTask, loadData]);

  const handleCreateChore = useCallback(async (choreData: CreateChoreInput) => {
    try {
      if (editingChore) {
        // Update existing chore
        await choresService.updateChore(editingChore.id, choreData);
      } else {
        // Create new chore
        await choresService.createChore(choreData);
      }
      loadData();
      setEditingChore(null);
    } catch (error) {
      console.error('Failed to save chore:', error);
    }
  }, [editingChore, loadData]);

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

  const handleDeleteItem = useCallback((itemId: string, type?: 'task' | 'chore') => {
    const itemType = type === 'chore' ? 'chore' : 'task';
    setItemToDelete({ id: itemId, type: itemType });
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'chore') {
        await choresService.deleteChore(itemToDelete.id);
      } else {
        await tasksService.deleteTask(itemToDelete.id);
      }
      loadData();
    } catch (error) {
      console.error(`Failed to delete ${itemToDelete.type}:`, error);
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, loadData]);

  const handleEditItem = useCallback((item: TaskOrChore) => {
    if (item.type === 'chore') {
      setEditingChore(item as Chore);
      setActiveTab('chore');
    } else {
      setEditingTask(item as Task);
      setActiveTab('task');
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
    setEditingChore(null);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleTabChange = useCallback((tab: TaskType) => {
    setActiveTab(tab);
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
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
  const handleViewDetails = useCallback((task: any) => {
    setSelectedTaskId(task.id);
    setActiveDetailModal('details');
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'attach':
        setActiveDetailModal('attachments');
        break;
      case 'snooze':
        setActiveDetailModal('snooze');
        break;
      case 'repeat':
        setIsRecurringModalOpen(true);
        break;
      default:
        break;
    }
  }, []);

  const closeDetailModals = useCallback(() => {
    setActiveDetailModal(null);
    setSelectedTaskId(null);
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    setSelectedTaskIds([]);
    refreshTasks();
    loadData();
  }, [refreshTasks, loadData]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks & Chores' }]}>
      <div className="p-4 sm:p-8">
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
              <div className="flex items-center gap-3 sm:gap-2 p-1.5 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-700">
                <button
                  onClick={() => handleTabChange('task')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[110px] ${
                    activeTab === 'task'
                      ? 'bg-gradient-tasks text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm">Tasks</span>
                </button>
                <button
                  onClick={() => handleTabChange('chore')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[110px] ${
                    activeTab === 'chore'
                      ? 'bg-gradient-tasks text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Chores</span>
                </button>
              </div>

              <button
                onClick={handleOpenModal}
                className="px-4 sm:px-6 py-2 sm:py-3 shimmer-tasks text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>New {activeTab === 'task' ? 'Task' : 'Chore'}</span>
              </button>
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

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks and chores..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          )}

          {/* Tasks List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar - Only show when filters are enabled */}
            {showFilters && activeTab === 'task' && currentSpace && (
              <div className="lg:col-span-1">
                <TaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Main Content */}
            <div className={showFilters && activeTab === 'task' ? 'lg:col-span-3' : 'lg:col-span-4'}>
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

                  {/* Status Filter - Segmented Buttons */}
                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-1 flex gap-1 w-fit">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        statusFilter === 'all'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[70px] ${
                        statusFilter === 'pending'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setStatusFilter('in_progress')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[85px] ${
                        statusFilter === 'in_progress'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                        statusFilter === 'completed'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>

                {loading || (activeTab === 'task' && realtimeLoading) ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
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
                          onClick={handleOpenModal}
                          className="btn-touch shimmer-tasks text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Create {activeTab === 'task' ? 'Task' : 'Chore'}
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
                ) : activeTab === 'task' && enableDragDrop && currentSpace ? (
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
                  <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {filteredItems.map((item) => (
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
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* New/Edit Modal - conditionally render based on activeTab */}
      {currentSpace && user && (
        <>
          {activeTab === 'task' ? (
            <NewTaskModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onSave={handleCreateTask}
              editTask={editingTask}
              spaceId={currentSpace.id}
            />
          ) : (
            <NewChoreModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onSave={handleCreateChore}
              editChore={editingChore}
              spaceId={currentSpace.id}
            />
          )}

          {/* Advanced Feature Modals */}
          <RecurringTaskModal
            isOpen={isRecurringModalOpen}
            onClose={() => setIsRecurringModalOpen(false)}
            onSave={() => {
              setIsRecurringModalOpen(false);
              refreshTasks();
              loadData();
            }}
            spaceId={currentSpace.id}
            userId={user.id}
          />

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

          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            spaceId={currentSpace.id}
            currentFilters={filters}
          />

          {/* Task Detail Modals */}
          {selectedTaskId && (
            <>
              {activeDetailModal === 'attachments' && (
                <AttachmentsModal
                  isOpen={true}
                  onClose={closeDetailModals}
                  taskId={selectedTaskId}
                  userId={user.id}
                />
              )}

              {activeDetailModal === 'dependencies' && (
                <DependenciesModal
                  isOpen={true}
                  onClose={closeDetailModals}
                  taskId={selectedTaskId}
                  spaceId={currentSpace.id}
                />
              )}

              {activeDetailModal === 'approval' && (
                <ApprovalModal
                  isOpen={true}
                  onClose={closeDetailModals}
                  taskId={selectedTaskId}
                  currentUserId={user.id}
                  spaceId={currentSpace.id}
                />
              )}

              {activeDetailModal === 'snooze' && (
                <SnoozeModal
                  isOpen={true}
                  onClose={closeDetailModals}
                  taskId={selectedTaskId}
                  userId={user.id}
                  onSnooze={() => {
                    closeDetailModals();
                    refreshTasks();
                    loadData();
                  }}
                />
              )}

              {/* Task Details Panel */}
              {activeDetailModal === 'details' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50" onClick={closeDetailModals} />
                  <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Details</h2>
                        <button
                          onClick={closeDetailModals}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Quick Actions */}
                      <TaskQuickActions
                        taskId={selectedTaskId}
                        spaceId={currentSpace.id}
                        userId={user.id}
                        onAction={handleQuickAction}
                      />

                      {/* Time Tracker */}
                      <TimeTracker taskId={selectedTaskId} userId={user.id} />

                      {/* Calendar Sync */}
                      <CalendarSyncToggle taskId={selectedTaskId} userId={user.id} />

                      {/* Chore Rotation */}
                      <ChoreRotationConfig taskId={selectedTaskId} spaceId={currentSpace.id} />

                      {/* Subtasks */}
                      <SubtasksList taskId={selectedTaskId} userId={user.id} />

                      {/* Comments */}
                      <TaskComments taskId={selectedTaskId} userId={user.id} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Bulk Actions Bar */}
      {currentSpace && activeTab === 'task' && (
        <BulkActionsBar
          selectedTaskIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onActionComplete={handleBulkActionComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteItem}
        title={`Delete ${itemToDelete?.type || 'Item'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type || 'item'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
  );
}
