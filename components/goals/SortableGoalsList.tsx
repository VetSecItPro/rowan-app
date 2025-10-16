'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Goal } from '@/lib/services/goals-service';
import { SortableGoalCard } from './SortableGoalCard';

interface SortableGoalsListProps {
  goals: Goal[];
  onReorder: (goalIds: string[]) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onStatusChange?: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  onPriorityChange?: (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => void;
  onTogglePin?: (goalId: string, isPinned: boolean) => void;
}

export function SortableGoalsList({
  goals,
  onReorder,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onTogglePin,
}: SortableGoalsListProps) {
  const [items, setItems] = useState(goals);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Call onReorder with new order
        onReorder(newItems.map(item => item.id));

        return newItems;
      });
    }
  };

  // Update items when goals prop changes
  useState(() => {
    setItems(goals);
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(goal => goal.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {items.map((goal) => (
            <SortableGoalCard
              key={goal.id}
              goal={goal}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
