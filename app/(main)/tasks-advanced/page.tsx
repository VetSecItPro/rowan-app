'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Home, Filter, Download } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';
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
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { CreateTaskInput } from '@/lib/types';
import { tasksService } from '@/lib/services/tasks-service';

type TaskType = 'task' | 'chore';

export default function TasksAdvancedPage() {
  const { currentSpace, user } = useAuth();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [activeTab, setActiveTab] = useState<TaskType>('task');
  const [showFilters, setShowFilters] = useState(false);

  // Real-time task management
  const { tasks, loading, refreshTasks } = useTaskRealtime({
    spaceId: currentSpace?.id || '',
    filters,
    onTaskAdded: (task) => console.log('Task added:', task.title),
    onTaskUpdated: (task) => console.log('Task updated:', task.title),
    onTaskDeleted: (taskId) => console.log('Task deleted:', taskId),
  });

  // Modal states
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Task detail states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeDetailModal, setActiveDetailModal] = useState<
    'attachments' | 'dependencies' | 'approval' | 'snooze' | 'details' | null
  >(null);

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  async function handleCreateTask(taskData: CreateTaskInput) {
    try {
      await tasksService.createTask(taskData);
      setIsNewTaskModalOpen(false);
      refreshTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  function handleTaskClick(task: any) {
    setSelectedTaskId(task.id);
    setActiveDetailModal('details');
  }

  function handleQuickAction(action: string) {
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
  }

  function closeDetailModals() {
    setActiveDetailModal(null);
    setSelectedTaskId(null);
  }

  if (!currentSpace || !user) {
    return (
      <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks (Advanced)' }]}>
        <div className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Please select a space to continue</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks (Advanced)' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-tasks flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-tasks bg-clip-text text-transparent">
                  Advanced Tasks
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  {selectedTaskIds.length > 0 && ` • ${selectedTaskIds.length} selected`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => setIsTemplatePickerOpen(true)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                From Template
              </button>
              <button
                onClick={() => setIsRecurringModalOpen(true)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Recurring
              </button>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="px-6 py-2 shimmer-tasks text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Task
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Pending</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">In Progress</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Completed</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            {showFilters && (
              <div className="lg:col-span-1">
                <TaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Task List */}
            <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
                  </div>
                ) : (
                  <DraggableTaskList
                    spaceId={currentSpace.id}
                    initialTasks={tasks}
                    onTaskClick={handleTaskClick}
                    onTasksReorder={refreshTasks}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
        onActionComplete={refreshTasks}
      />

      {/* Create/Edit Modals */}
      {currentSpace && (
        <>
          <NewTaskModal
            isOpen={isNewTaskModalOpen}
            onClose={() => setIsNewTaskModalOpen(false)}
            onSave={handleCreateTask}
            spaceId={currentSpace.id}
          />

          <RecurringTaskModal
            isOpen={isRecurringModalOpen}
            onClose={() => setIsRecurringModalOpen(false)}
            onSave={() => {
              setIsRecurringModalOpen(false);
              refreshTasks();
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
            }}
            spaceId={currentSpace.id}
          />

          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            spaceId={currentSpace.id}
            currentFilters={filters}
          />
        </>
      )}

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
              }}
            />
          )}

          {/* Task Details Panel */}
          {activeDetailModal === 'details' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={closeDetailModals} />
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
    </FeatureLayout>
  );
}
