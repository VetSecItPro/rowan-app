import { useCallback, useRef } from 'react';
import { tasksService } from '@/lib/services/tasks-service';
import { taskTemplatesService } from '@/lib/services/task-templates-service';
import { choresService, type UpdateChoreInput } from '@/lib/services/chores-service';
import type { Task, Chore } from '@/lib/types';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task-schemas';
import type { CreateChoreInput } from '@/lib/services/chores-service';
import { pointsService } from '@/lib/services/rewards';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { showSuccess, showError } from '@/lib/utils/toast';
import type { TasksDataReturn } from '@/lib/hooks/useTasksData';
import type { TasksModalsReturn } from '@/lib/hooks/useTasksModals';

// =============================================
// DEPS INTERFACE
// =============================================

export interface TasksHandlersDeps {
  // From data hook
  user: TasksDataReturn['user'];
  currentSpace: TasksDataReturn['currentSpace'];
  spaceId: TasksDataReturn['spaceId'];
  tasks: TasksDataReturn['tasks'];
  setTasks: TasksDataReturn['setTasks'];
  setChores: TasksDataReturn['setChores'];
  setChoreLoading: TasksDataReturn['setChoreLoading'];
  refreshTasks: TasksDataReturn['refreshTasks'];
  refreshChores: TasksDataReturn['refreshChores'];
  loadData: TasksDataReturn['loadData'];

  // From modals hook
  editingItem: TasksModalsReturn['editingItem'];
  modalDefaultType: TasksModalsReturn['modalDefaultType'];
  closeUnifiedModal: TasksModalsReturn['closeUnifiedModal'];
  closeTemplatePicker: TasksModalsReturn['closeTemplatePicker'];
  clearSelectedTaskIds: TasksModalsReturn['clearSelectedTaskIds'];
}

// =============================================
// RETURN INTERFACE
// =============================================

export interface TasksHandlersReturn {
  handleSaveItem: (itemData: CreateTaskInput | CreateChoreInput) => Promise<void | { id: string }>;
  handleStatusChange: (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => Promise<void>;
  handleDeleteItem: (itemId: string, type?: 'task' | 'chore') => Promise<void>;
  handleSaveAsTemplate: (item: Task & { type?: 'task' | 'chore' }) => Promise<void>;
  handleBulkActionComplete: () => void;
  handleTemplateSelect: (templateId: string) => Promise<void>;
}

// =============================================
// HOOK
// =============================================

/** Provides CRUD handlers for tasks including status toggling, assignment, and deletion */
export function useTasksHandlers(deps: TasksHandlersDeps): TasksHandlersReturn {
  const {
    user,
    currentSpace,
    spaceId,
    tasks,
    setTasks,
    setChores,
    setChoreLoading,
    refreshTasks,
    refreshChores,
    loadData,
    editingItem,
    modalDefaultType,
    closeUnifiedModal,
    closeTemplatePicker,
    clearSelectedTaskIds,
  } = deps;

  // Track pending deletion timeouts for undo support
  const pendingDeletionRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleSaveItem = useCallback(async (itemData: CreateTaskInput | CreateChoreInput): Promise<void | { id: string }> => {
    try {
      if (editingItem) {
        // Update existing item
        if (editingItem.type === 'task') {
          await tasksService.updateTask(editingItem.id, itemData as UpdateTaskInput);
        } else {
          await choresService.updateChore(editingItem.id, itemData as CreateChoreInput);
        }
        closeUnifiedModal();
        return;
      } else {
        // Create new item with optimistic updates
        if (modalDefaultType === 'task') {
          const taskData = itemData as CreateTaskInput;
          const tempId = `temp-${Date.now()}`;
          const optimisticTask: Task = {
            id: tempId,
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
            estimated_hours: taskData.estimated_hours ?? undefined,
            priority: taskData.priority || 'medium',
            calendar_sync: taskData.calendar_sync ?? false,
            quick_note: taskData.quick_note ?? undefined,
            created_by: taskData.created_by ?? user?.id ?? '',
            sort_order: Date.now(),
          };

          setTasks(prev => [optimisticTask, ...prev]);

          try {
            const createdTask = await tasksService.createTask(itemData as CreateTaskInput);

            setTasks(prev => prev.map(task =>
              task.id === tempId ? createdTask : task
            ));

            return { id: createdTask.id };
          } catch (error) {
            setTasks(prev => prev.filter(task => task.id !== tempId));
            logger.error('Failed to create task', error, { component: 'page', action: 'create_task' });
            throw error;
          }
        } else {
          const choreData = itemData as CreateChoreInput;
          const tempId = `temp-${Date.now()}`;
          const optimisticChore: Chore = {
            id: tempId,
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
            sort_order: Date.now(),
          };

          setChores(prev => [optimisticChore, ...prev]);

          try {
            const createdChore = await choresService.createChore(itemData as CreateChoreInput);

            setChores(prev => prev.map(chore =>
              chore.id === tempId ? createdChore : chore
            ));

            return { id: createdChore.id };
          } catch (error) {
            setChores(prev => prev.filter(chore => chore.id !== tempId));
            logger.error('Failed to create chore', error, { component: 'page', action: 'create_chore' });
            throw error;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to save item', error, { component: 'page', action: 'save_item', itemType: modalDefaultType });

      if (modalDefaultType === 'chore') {
        setChoreLoading(false);
        refreshChores();
      } else {
        refreshTasks();
      }
    }
  }, [editingItem, modalDefaultType, closeUnifiedModal, refreshChores, refreshTasks, setChoreLoading, setChores, setTasks, user]);

  const handleStatusChange = useCallback(async (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => {
    try {
      if (type === 'chore') {
        // Optimistic update for chores
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
          if (status === 'completed' && user) {
            const result = await choresService.completeChoreWithRewards(itemId, user.id);
            if (result.pointsAwarded > 0) {
              // Points awarded successfully
            }
          } else {
            const updateData: UpdateChoreInput = { status };
            if (status === 'completed') {
              updateData.completed_at = new Date().toISOString();
            }
            await choresService.updateChore(itemId, updateData);
          }
        } catch (error) {
          refreshChores();
          throw error;
        }
      } else {
        const task = tasks.find(t => t.id === itemId);

        // Optimistic update for tasks
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
          await tasksService.updateTask(itemId, { status });

          if (status === 'completed' && user && spaceId && task) {
            try {
              await pointsService.awardTaskPoints(user.id, spaceId, itemId, task.title);
            } catch (pointsError) {
              logger.error('Failed to award points for task', pointsError, { component: 'page', action: 'award_points' });
            }
          }
        } catch (error) {
          refreshTasks();
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to update item status', error, { component: 'page', action: 'update_status', itemId });

      if (type === 'chore') {
        refreshChores();
      }
    }
  }, [refreshChores, refreshTasks, setChores, setTasks, spaceId, tasks, user]);

  const handleDeleteItem = useCallback(async (itemId: string, type?: 'task' | 'chore') => {
    const isChore = type === 'chore';
    const label = isChore ? 'Chore' : 'Task';

    if (isChore) {
      // Save chore data before removal (we need deps.chores but it's not in deps,
      // so we read from the current state via a ref-like pattern)
      // For chores, we use setChores to capture and restore
      let savedChore: Chore | undefined;

      setChores(prev => {
        savedChore = prev.find(c => c.id === itemId);
        return prev.filter(c => c.id !== itemId);
      });

      if (!savedChore) return;

      const capturedChore = savedChore;

      // Clear any existing timeout for this item
      const existingTimeout = pendingDeletionRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeoutId = setTimeout(async () => {
        try {
          await choresService.deleteChore(itemId);
          pendingDeletionRef.current.delete(itemId);
          refreshChores();
        } catch (error) {
          logger.error('Failed to delete chore', error, { component: 'page', action: 'delete_item', itemId });
          showError('Failed to delete chore');
          setChores(prev => [capturedChore, ...prev]);
          pendingDeletionRef.current.delete(itemId);
        }
      }, 5000);

      pendingDeletionRef.current.set(itemId, timeoutId);

      toast(`${label} deleted`, {
        description: 'You have 5 seconds to undo this action.',
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(timeoutId);
            pendingDeletionRef.current.delete(itemId);
            setChores(prev => [capturedChore, ...prev]);
            showSuccess(`${label} restored!`);
          },
        },
      });
    } else {
      // Save task data before removal
      const savedTask = tasks.find(t => t.id === itemId);
      if (!savedTask) return;

      // Optimistic removal
      setTasks(prev => prev.filter(task => task.id !== itemId));

      // Clear any existing timeout for this item
      const existingTimeout = pendingDeletionRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeoutId = setTimeout(async () => {
        try {
          await tasksService.deleteTask(itemId);
          pendingDeletionRef.current.delete(itemId);
        } catch (error) {
          logger.error('Failed to delete task', error, { component: 'page', action: 'delete_item', itemId });
          showError('Failed to delete task');
          setTasks(prev => [savedTask, ...prev]);
          pendingDeletionRef.current.delete(itemId);
        }
      }, 5000);

      pendingDeletionRef.current.set(itemId, timeoutId);

      toast(`${label} deleted`, {
        description: 'You have 5 seconds to undo this action.',
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(timeoutId);
            pendingDeletionRef.current.delete(itemId);
            setTasks(prev => [savedTask, ...prev]);
            showSuccess(`${label} restored!`);
          },
        },
      });
    }
  }, [tasks, refreshChores, setChores, setTasks]);

  const handleSaveAsTemplate = useCallback(async (item: Task & { type?: 'task' | 'chore' }) => {
    if (item.type !== 'task' || !currentSpace || !user) return;

    try {
      await taskTemplatesService.createFromTask(item.id, `${item.title} Template`, user.id);
    } catch (error) {
      logger.error('Failed to save task as template', error, {
        component: 'tasks-page',
        action: 'save_as_template',
        taskId: item.id
      });
    }
  }, [currentSpace, user]);

  const handleBulkActionComplete = useCallback(() => {
    clearSelectedTaskIds();
    refreshTasks();
    loadData();
  }, [clearSelectedTaskIds, refreshTasks, loadData]);

  const handleTemplateSelect = useCallback(async (templateId: string) => {
    closeTemplatePicker();
    try {
      const newTask = await taskTemplatesService.createTaskFromTemplate(templateId);
      if (newTask) {
        refreshTasks();
      }
    } catch (error) {
      logger.error('Failed to create task from template', error, {
        component: 'tasks-page',
        action: 'create_from_template',
        templateId
      });
    }
  }, [closeTemplatePicker, refreshTasks]);

  return {
    handleSaveItem,
    handleStatusChange,
    handleDeleteItem,
    handleSaveAsTemplate,
    handleBulkActionComplete,
    handleTemplateSelect,
  };
}
