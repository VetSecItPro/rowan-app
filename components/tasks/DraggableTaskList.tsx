'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { hapticMedium, hapticLight } from '@/lib/utils/haptics';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle, Clock, AlertCircle, MoreVertical, CheckSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  sort_order: number;
  due_date?: string;
  assigned_to?: string;
}

interface DraggableTaskListProps {
  spaceId: string;
  initialTasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTasksReorder?: (tasks: Task[]) => void;
  onStatusChange?: (taskId: string, status: string, type?: 'task' | 'chore') => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (task: Task) => void;
}

interface SortableTaskItemProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: string, type?: 'task' | 'chore') => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (task: Task) => void;
}

function SortableTaskItem({ task, onTaskClick, onStatusChange, onEdit, onDelete, onViewDetails }: SortableTaskItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragReady, setIsDragReady] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Long-press handlers for mobile touch
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsDragReady(true);
      hapticMedium(); // Haptic feedback when drag is ready
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Reset after a delay to allow drag to complete
    setTimeout(() => setIsDragReady(false), 100);
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsDragReady(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'border-l-green-500 bg-green-900/10';
      case 'in_progress':
        return 'border-l-blue-500 bg-blue-900/10';
      case 'blocked':
        return 'border-l-red-500 bg-red-900/10';
      case 'on-hold':
        return 'border-l-amber-500 bg-amber-900/10';
      default:
        return 'border-l-gray-600 bg-gray-800';
    }
  }

  function getPriorityIcon(priority: string) {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <AlertCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  }

  // Handle status rotation: pending → in_progress → completed → pending
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger task click
    if (!onStatusChange) return;

    let newStatus = 'pending';
    if (task.status === 'pending') {
      newStatus = 'in_progress';
    } else if (task.status === 'in_progress') {
      newStatus = 'completed';
    } else if (task.status === 'completed') {
      newStatus = 'pending';
    }

    onStatusChange(task.id, newStatus, 'task');
  };

  // Get checkbox styling based on status
  const getCheckboxStyle = () => {
    if (task.status === 'completed') {
      return 'bg-green-500 border-green-500';
    } else if (task.status === 'in_progress') {
      return 'bg-amber-500 border-amber-500';
    } else {
      return 'border-2 border-red-500 bg-transparent';
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 rounded-lg border-l-4 ${getStatusColor(task.status)} border border-gray-700 hover:shadow-md transition-shadow`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="cursor-grab active:cursor-grabbing p-1 touch-none"
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </button>

      {/* Status Checkbox */}
      <button
        onClick={handleStatusClick}
        className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${getCheckboxStyle()}`}
      >
        {task.status === 'completed' && (
          <CheckSquare className="w-3 h-3 text-white" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-medium text-white truncate ${
            task.status === 'completed' ? 'line-through opacity-60' : ''
          }`}>
            {task.title}
          </h3>
          {isOverdue && (
            <span className="px-2 py-0.5 text-xs bg-red-900/20 text-red-300 rounded">
              Overdue
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-gray-400 truncate">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {getPriorityIcon(task.priority)}
          {task.due_date && (
            <span className="text-xs text-gray-500">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* More Menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-1 w-40 dropdown-mobile bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm rounded-t-lg"
                >
                  View Details
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(task);
                  setShowMenu(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm ${!onViewDetails ? 'rounded-t-lg' : ''}`}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(task.id, 'task');
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 rounded-b-lg"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DraggableTaskList({
  spaceId,
  initialTasks,
  onTaskClick,
  onTasksReorder,
  onStatusChange,
  onEdit,
  onDelete,
  onViewDetails,
}: DraggableTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8px to 3px for more responsive dragging
        delay: 100, // Reduced from 200ms to 100ms for better responsiveness
        tolerance: 3, // Reduced tolerance for more precise activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    hapticMedium(); // Haptic feedback on drag start
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // Create new array with reordered tasks
    const reorderedTasks = [...tasks];
    const [movedTask] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);

    // Update sort_order for all affected tasks
    const updatedTasks = reorderedTasks.map((task, index) => ({
      ...task,
      sort_order: index,
    }));

    // Update local state immediately for smooth UX
    setTasks(updatedTasks);
    hapticLight(); // Haptic feedback on successful drop

    // Update all affected tasks in database (batch update)
    // Don't call onTasksReorder to avoid infinite loop - let real-time handle updates
    try {
      const supabase = createClient();
      const updates = updatedTasks.map((task, index) =>
        supabase
          .from('tasks')
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq('id', task.id)
      );
      await Promise.all(updates);
    } catch (error) {
      logger.error('Error updating task order:', error, { component: 'DraggableTaskList', action: 'component_action' });
      // Revert on error
      setTasks(initialTasks);
    }

    setActiveId(null);
  }

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No tasks yet. Create your first task to get started!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700 shadow-2xl opacity-90">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">
                {activeTask.title}
              </h3>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
