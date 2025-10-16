'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Goal } from '@/lib/services/goals-service';
import { GoalCard } from './GoalCard';
import { GripVertical, Pin, Sparkles } from 'lucide-react';
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/utils/haptics';

interface SortableGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  onPriorityChange?: (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => void;
  onTogglePin?: (goalId: string, isPinned: boolean) => void;
}

const priorityConfig = {
  p1: { label: 'P1', color: 'bg-red-500 text-white', textColor: 'text-red-600 dark:text-red-400' },
  p2: { label: 'P2', color: 'bg-orange-500 text-white', textColor: 'text-orange-600 dark:text-orange-400' },
  p3: { label: 'P3', color: 'bg-yellow-500 text-white', textColor: 'text-yellow-600 dark:text-yellow-400' },
  p4: { label: 'P4', color: 'bg-blue-500 text-white', textColor: 'text-blue-600 dark:text-blue-400' },
  none: { label: '', color: '', textColor: '' },
};

export function SortableGoalCard({
  goal,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onTogglePin,
}: SortableGoalCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPriorityChange) return;

    hapticLight(); // Haptic feedback on priority change

    // Cycle through priorities: none → p1 → p2 → p3 → p4 → none
    const priorities: Array<'none' | 'p1' | 'p2' | 'p3' | 'p4'> = ['none', 'p1', 'p2', 'p3', 'p4'];
    const currentIndex = priorities.indexOf(goal.priority || 'none');
    const nextIndex = (currentIndex + 1) % priorities.length;
    onPriorityChange(goal.id, priorities[nextIndex]);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      if (!goal.is_pinned) {
        hapticSuccess(); // Success haptic when pinning
      } else {
        hapticLight(); // Light haptic when unpinning
      }
      onTogglePin(goal.id, !goal.is_pinned);
    }
  };

  const priorityInfo = priorityConfig[goal.priority || 'none'];

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag Handle - appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <div className="w-11 h-11 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
          <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      {/* Priority and Pin Badges - top right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {/* Pin Badge */}
        {onTogglePin && (
          <button
            onClick={handlePinClick}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all active:scale-95 ${
              goal.is_pinned
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={goal.is_pinned ? 'Unpin goal' : 'Pin goal'}
          >
            <Pin className={`w-5 h-5 ${goal.is_pinned ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Priority Badge */}
        {onPriorityChange && (
          <button
            onClick={handlePriorityClick}
            className={`px-4 py-3 min-h-[44px] rounded-lg font-bold text-xs transition-all active:scale-95 ${
              priorityInfo.color || 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="Click to change priority"
          >
            {priorityInfo.label || 'Set Priority'}
          </button>
        )}
      </div>

      {/* Pinned Indicator */}
      {goal.is_pinned && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-xl" />
      )}

      {/* Goal Card */}
      <div className={isDragging ? 'opacity-50' : ''}>
        <GoalCard
          goal={goal}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  );
}
