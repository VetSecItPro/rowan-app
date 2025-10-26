'use client';

import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { hapticMedium, hapticLight } from '@/lib/utils/haptics';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical } from 'lucide-react';
import { ShoppingItem } from '@/lib/services/shopping-service';
import { getCategoryIcon, getCategoryLabel } from '@/lib/constants/shopping-categories';
import { Tooltip } from '@/components/ui/Tooltip';

interface SortableItemProps {
  item: ShoppingItem;
  onToggle: (itemId: string, checked: boolean) => void;
}

function SortableItem({ item, onToggle }: SortableItemProps) {
  const [isDragReady, setIsDragReady] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 sm:p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all ${
        isDragging ? 'opacity-50 shadow-2xl scale-105 z-50' : 'hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600'
      }`}
    >
      {/* Drag Handle - Optimized for touch */}
      <Tooltip content="Drag to reorder (long-press on mobile)" delay={0}>
        <button
          {...attributes}
          {...listeners}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className={`cursor-grab active:cursor-grabbing p-2 md:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all touch-none ${
            isDragReady ? 'bg-emerald-100 dark:bg-emerald-900/30 scale-110' : ''
          }`}
          aria-label="Drag to reorder item (long-press on mobile)"
        >
          <GripVertical className={`w-6 h-6 md:w-4 md:h-4 transition-colors ${
            isDragReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
          }`} />
        </button>
      </Tooltip>

      {/* Checkbox - Mobile-optimized touch target */}
      <Tooltip content={item.checked ? 'Mark as not purchased' : 'Mark as purchased'} delay={0}>
        <button
          onClick={() => onToggle(item.id, !item.checked)}
          className={`flex-shrink-0 w-11 h-11 sm:w-8 sm:h-8 md:w-6 md:h-6 rounded flex items-center justify-center transition-all ${
            item.checked
              ? 'bg-green-500 border-green-500'
              : 'border-2 border-gray-300 dark:border-gray-600 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={`Toggle item: ${item.name}`}
        >
          {item.checked && <Check className="w-4 h-4 sm:w-3 sm:h-3 text-white" />}
        </button>
      </Tooltip>

      {/* Category Icon */}
      <span className="text-base flex-shrink-0">{getCategoryIcon(item.category as any)}</span>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
          {item.name}
        </p>
        {item.quantity > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
        )}
      </div>
    </div>
  );
}

interface DraggableItemsListProps {
  items: ShoppingItem[];
  onReorder: (reorderedItems: ShoppingItem[]) => void;
  onToggleItem: (itemId: string, checked: boolean) => void;
}

export function DraggableItemsList({ items, onReorder, onToggleItem }: DraggableItemsListProps) {
  const [localItems, setLocalItems] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
        delay: 200, // 200ms delay for touch devices to prevent scroll conflict
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    hapticMedium(); // Haptic feedback on drag start
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex((item) => item.id === active.id);
      const newIndex = localItems.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(localItems, oldIndex, newIndex);

      // Update sort_order for each item
      const itemsWithNewOrder = newItems.map((item, index) => ({
        ...item,
        sort_order: index,
      }));

      setLocalItems(itemsWithNewOrder);
      onReorder(itemsWithNewOrder);
      hapticLight(); // Haptic feedback on successful drop
    }
  };

  // Group items by category
  const itemsByCategory = localItems.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <div key={category} className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-lg">{getCategoryIcon(category as any)}</span>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {getCategoryLabel(category as any)}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">({categoryItems.length})</span>
            </div>

            {/* Sortable Items */}
            <SortableContext
              items={categoryItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onToggle={onToggleItem}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
