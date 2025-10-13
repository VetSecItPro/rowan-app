'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { DraggableTaskList } from './DraggableTaskList';
import { TaskFilterPanel, TaskFilters } from './TaskFilterPanel';
import { BulkActionsBar } from './BulkActionsBar';
import { RecurringTaskModal } from './RecurringTaskModal';
import { TemplatePickerModal } from './TemplatePickerModal';
import { AttachmentsModal } from './AttachmentsModal';
import { DependenciesModal } from './DependenciesModal';
import { ApprovalModal } from './ApprovalModal';
import { SnoozeModal } from './SnoozeModal';
import { ExportModal } from './ExportModal';
import { SubtasksList } from './SubtasksList';
import { TimeTracker } from './TimeTracker';
import { TaskComments } from './TaskComments';
import { TaskQuickActions } from './TaskQuickActions';
import { CalendarSyncToggle } from './CalendarSyncToggle';
import { ChoreRotationConfig } from './ChoreRotationConfig';

interface TasksPageExampleProps {
  spaceId: string;
  userId: string;
}

/**
 * Example implementation showing how to integrate all 17 task management components.
 * This serves as a reference for implementing a complete tasks page with:
 * - Real-time updates
 * - Drag-and-drop reordering
 * - Advanced filtering
 * - Bulk operations
 * - All modal components
 * - Quick actions
 *
 * Components included:
 * 1. DraggableTaskList - drag-and-drop task reordering
 * 2. TaskFilterPanel - advanced filtering UI
 * 3. BulkActionsBar - multi-task operations
 * 4. RecurringTaskModal - create recurring tasks
 * 5. TemplatePickerModal - select from templates
 * 6. AttachmentsModal - file upload/download
 * 7. DependenciesModal - task relationships
 * 8. ApprovalModal - approval workflow
 * 9. SnoozeModal - postpone tasks
 * 10. ExportModal - CSV export
 * 11. SubtasksList - subtask management
 * 12. TimeTracker - time tracking
 * 13. TaskComments - comments and reactions
 * 14. TaskQuickActions - quick action buttons
 * 15. CalendarSyncToggle - calendar integration
 * 16. ChoreRotationConfig - automated rotation
 * 17. useTaskRealtime hook - real-time subscriptions
 */
export function TasksPageExample({ spaceId, userId }: TasksPageExampleProps) {
  // Real-time task management with filters
  const [filters, setFilters] = useState<TaskFilters>({});
  const { tasks, loading, refreshTasks } = useTaskRealtime({
    spaceId,
    filters,
    onTaskAdded: (task) => console.log('Task added:', task),
    onTaskUpdated: (task) => console.log('Task updated:', task),
    onTaskDeleted: (taskId) => console.log('Task deleted:', taskId),
  });

  // Modal states
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Task detail modal states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<
    'attachments' | 'dependencies' | 'approval' | 'snooze' | 'details' | null
  >(null);

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  function handleTaskClick(task: any) {
    setSelectedTaskId(task.id);
    setActiveModal('details');
  }

  function handleBulkActionComplete() {
    setSelectedTaskIds([]);
    refreshTasks();
  }

  function handleQuickAction(action: string) {
    switch (action) {
      case 'attach':
        setActiveModal('attachments');
        break;
      case 'snooze':
        setActiveModal('snooze');
        break;
      case 'assign':
        // Handle assign action
        break;
      case 'repeat':
        setIsRecurringModalOpen(true);
        break;
      default:
        break;
    }
  }

  function closeModals() {
    setActiveModal(null);
    setSelectedTaskId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                {selectedTaskIds.length > 0 && ` • ${selectedTaskIds.length} selected`}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                Recurring Task
              </button>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Export
              </button>
              <button
                onClick={() => {/* Create new task */}}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus className="w-5 h-5" />
                New Task
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <TaskFilterPanel
              spaceId={spaceId}
              onFilterChange={setFilters}
            />
          </div>

          {/* Main Content - Task List */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading tasks...</div>
            ) : (
              <DraggableTaskList
                spaceId={spaceId}
                initialTasks={tasks}
                onTaskClick={handleTaskClick}
                onTasksReorder={refreshTasks}
              />
            )}
          </div>
        </div>

        {/* Bulk Actions Bar (sticky bottom) */}
        <BulkActionsBar
          selectedTaskIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onActionComplete={handleBulkActionComplete}
        />

        {/* Modals */}
        <RecurringTaskModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          onSave={() => {
            setIsRecurringModalOpen(false);
            refreshTasks();
          }}
          spaceId={spaceId}
          userId={userId}
        />

        <TemplatePickerModal
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          onSelect={(templateId) => {
            console.log('Selected template:', templateId);
            setIsTemplatePickerOpen(false);
            // Create task from template
          }}
          spaceId={spaceId}
        />

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          spaceId={spaceId}
          currentFilters={filters}
        />

        {/* Task Detail Modals (shown when task is selected) */}
        {selectedTaskId && (
          <>
            {activeModal === 'attachments' && (
              <AttachmentsModal
                isOpen={true}
                onClose={closeModals}
                taskId={selectedTaskId}
                userId={userId}
              />
            )}

            {activeModal === 'dependencies' && (
              <DependenciesModal
                isOpen={true}
                onClose={closeModals}
                taskId={selectedTaskId}
                spaceId={spaceId}
              />
            )}

            {activeModal === 'approval' && (
              <ApprovalModal
                isOpen={true}
                onClose={closeModals}
                taskId={selectedTaskId}
                currentUserId={userId}
                spaceId={spaceId}
              />
            )}

            {activeModal === 'snooze' && (
              <SnoozeModal
                isOpen={true}
                onClose={closeModals}
                taskId={selectedTaskId}
                userId={userId}
                onSnooze={() => {
                  closeModals();
                  refreshTasks();
                }}
              />
            )}

            {/* Task Details Panel */}
            {activeModal === 'details' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={closeModals} />
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Task Details
                    </h2>

                    {/* Quick Actions */}
                    <TaskQuickActions
                      taskId={selectedTaskId}
                      spaceId={spaceId}
                      userId={userId}
                      onAction={handleQuickAction}
                    />

                    {/* Time Tracker */}
                    <TimeTracker taskId={selectedTaskId} userId={userId} />

                    {/* Calendar Sync */}
                    <CalendarSyncToggle taskId={selectedTaskId} userId={userId} />

                    {/* Chore Rotation Config */}
                    <ChoreRotationConfig taskId={selectedTaskId} spaceId={spaceId} />

                    {/* Subtasks */}
                    <SubtasksList taskId={selectedTaskId} userId={userId} />

                    {/* Comments */}
                    <TaskComments taskId={selectedTaskId} userId={userId} />

                    <button
                      onClick={closeModals}
                      className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
