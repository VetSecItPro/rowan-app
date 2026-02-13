'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Goal } from '@/lib/services/goals-service';
import { GoalCard } from './GoalCard';
import { GripVertical } from 'lucide-react';
import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';
import { PresenceIndicator } from '@/components/shared/PresenceIndicator';
import type { PresenceUser } from '@/lib/hooks/usePresence';

interface SortableGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onCheckIn?: (goal: Goal) => void;
  onShowHistory?: (goal: Goal) => void;
  onFrequencySettings?: (goal: Goal) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  onPriorityChange?: (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => void;
  onTogglePin?: (goalId: string, isPinned: boolean) => void;
  viewingUsers?: PresenceUser[];
}

export function SortableGoalCard({
  goal,
  onEdit,
  onDelete,
  onCheckIn,
  onShowHistory,
  onFrequencySettings,
  onStatusChange,
  onPriorityChange,
  onTogglePin,
  viewingUsers = [],
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

  const handlePriorityChange = (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => {
    hapticLight();
    onPriorityChange?.(goalId, priority);
  };

  const handleTogglePin = (goalId: string, isPinned: boolean) => {
    if (isPinned) {
      hapticSuccess();
    } else {
      hapticLight();
    }
    onTogglePin?.(goalId, isPinned);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag Handle - appears on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <div className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
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
          onCheckIn={onCheckIn}
          onShowHistory={onShowHistory}
          onFrequencySettings={onFrequencySettings}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange ? handlePriorityChange : undefined}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          extraActions={viewingUsers.length > 0 ? <PresenceIndicator users={viewingUsers} maxDisplay={2} /> : undefined}
        />
      </div>
    </div>
  );
}
