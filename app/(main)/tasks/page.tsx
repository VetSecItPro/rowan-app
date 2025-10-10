'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckSquare, Search, Plus, Clock, CheckCircle2, AlertCircle, ChevronDown, Home } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { NewChoreModal } from '@/components/projects/NewChoreModal';
import GuidedTaskCreation from '@/components/guided/GuidedTaskCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { tasksService } from '@/lib/services/tasks-service';
import { choresService, Chore, CreateChoreInput } from '@/lib/services/chores-service';
import { Task, CreateTaskInput } from '@/lib/types';
import { getUserProgress } from '@/lib/services/user-progress-service';

type TaskType = 'task' | 'chore';
type TaskOrChore = (Task & { type: 'task' }) | (Chore & { type: 'chore' });

export default function TasksPage() {
  const { currentSpace, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
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
    // Hide completed items by default
    let filtered = allItems.filter(item => item.status !== 'completed');

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

  // Memoized loadData function to fetch both tasks and chores
  const loadData = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch both tasks and chores in parallel
      const [tasksData, choresData] = await Promise.all([
        tasksService.getTasks(currentSpace.id),
        choresService.getChores(currentSpace.id),
      ]);
      setTasks(tasksData);
      setChores(choresData);

      // Try to fetch user progress (non-blocking)
      try {
        const userProgressResult = await getUserProgress(user.id);
        if (userProgressResult.success && userProgressResult.data) {
          setHasCompletedGuide(userProgressResult.data.first_task_created);

          // Show guided flow if no tasks exist and user hasn't completed the guide
          if (tasksData.length === 0 && choresData.length === 0 && !userProgressResult.data.first_task_created) {
            setShowGuidedFlow(true);
          }
        }
      } catch (progressError) {
        console.warn('Failed to load user progress (non-critical):', progressError);
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

  const handleDeleteItem = useCallback(async (itemId: string, type?: 'task' | 'chore') => {
    const itemType = type === 'chore' ? 'chore' : 'task';
    if (!confirm(`Are you sure you want to delete this ${itemType}?`)) return;

    try {
      if (type === 'chore') {
        await choresService.deleteChore(itemId);
      } else {
        await tasksService.deleteTask(itemId);
      }
      loadData();
    } catch (error) {
      console.error(`Failed to delete ${itemType}:`, error);
    }
  }, [loadData]);

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

  const handleGuidedFlowSkip = useCallback(() => {
    setShowGuidedFlow(false);
  }, []);

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
              <div className="flex items-center gap-2 p-1.5 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-700">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Pending */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Pending</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>

            {/* In Progress */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>

            {/* Total Tasks & Chores */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Total Tasks & Chores</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-tasks rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
          )}

          {/* Search & Filter Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks and chores..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="relative sm:min-w-[150px]">
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none w-full"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          )}

          {/* Tasks List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                All Tasks & Chores ({filteredItems.length})
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>

            {loading ? (
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
                      className="px-6 py-3 shimmer-tasks text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create {activeTab === 'task' ? 'Task' : 'Chore'}
                    </button>
                    {!hasCompletedGuide && (
                      <button
                        onClick={() => setShowGuidedFlow(true)}
                        className="px-6 py-3 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                      >
                        <CheckSquare className="w-5 h-5" />
                        Try Guided Creation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <TaskCard
                    key={item.id}
                    task={item}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* New/Edit Modal - conditionally render based on activeTab */}
      {currentSpace && (
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
        </>
      )}
    </FeatureLayout>
  );
}
