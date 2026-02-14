'use client';

import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { taskSubtasksService, Subtask } from '@/lib/services/task-subtasks-service';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { logger } from '@/lib/logger';

interface SubtasksListProps {
  taskId: string;
  userId: string;
}

/** Renders a list of subtasks with completion toggles and add controls. */
export function SubtasksList({ taskId, userId }: SubtasksListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSubtasks is a stable function
  }, [taskId]);

  async function loadSubtasks() {
    try {
      const data = await taskSubtasksService.getSubtasks(taskId);
      setSubtasks(data);
    } catch (error) {
      logger.error('Error loading subtasks:', error, { component: 'SubtasksList', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      await taskSubtasksService.createSubtask({
        parent_task_id: taskId,
        title: newSubtaskTitle,
        created_by: userId,
        sort_order: subtasks.length,
      });
      setNewSubtaskTitle('');
      loadSubtasks();
    } catch (error) {
      logger.error('Error creating subtask:', error, { component: 'SubtasksList', action: 'component_action' });
    }
  }

  async function toggleSubtask(subtaskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await taskSubtasksService.updateSubtask(subtaskId, { status: newStatus });
      loadSubtasks();
    } catch (error) {
      logger.error('Error updating subtask:', error, { component: 'SubtasksList', action: 'component_action' });
    }
  }

  const completionPercentage = subtasks.length > 0
    ? Math.round((subtasks.filter(s => s.status === 'completed').length / subtasks.length) * 100)
    : 0;

  if (loading) return <div className="text-sm text-gray-400">Loading subtasks...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">
          Subtasks {subtasks.length > 0 && `(${completionPercentage}% complete)`}
        </h4>
      </div>

      <form onSubmit={handleAddSubtask} className="flex gap-2">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          placeholder="Add a subtask..."
          className="flex-1 px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-900"
        />
        <CTAButton
          type="submit"
          feature="tasks"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
        >
        </CTAButton>
      </form>

      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg"
            >
              <button
                onClick={() => toggleSubtask(subtask.id, subtask.status)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  subtask.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}
              >
                {subtask.status === 'completed' && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${subtask.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
