'use client';

import { useState, useEffect, useRef } from 'react';
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
import { GripVertical, CheckCircle, Clock, AlertCircle, MoreVertical, CheckSquare, Home, Pause } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UnifiedItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  sort_order: number;
  due_date?: string;
  assigned_to?: string;
  type: 'task' | 'chore';
  frequency?: string; // For chores
  category?: string; // For tasks/chores
}

interface DraggableItemListProps {
  spaceId: string;
  initialItems: UnifiedItem[];
  onItemClick?: (item: UnifiedItem) => void;
  onItemsReorder?: (items: UnifiedItem[]) => void;
  onStatusChange?: (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => void;
  onEdit?: (item: UnifiedItem) => void;
  onDelete?: (itemId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (item: UnifiedItem) => void;
}

interface SortableItemProps {
  item: UnifiedItem;
  onItemClick?: (item: UnifiedItem) => void;
  onStatusChange?: (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => void;
  onEdit?: (item: UnifiedItem) => void;
  onDelete?: (itemId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (item: UnifiedItem) => void;
}

function SortableItem({ item, onItemClick, onStatusChange, onEdit, onDelete, onViewDetails }: SortableItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'completed';

  // Handle status rotation - 5-step cycle
  const handleStatusClick = () => {
    let newStatus: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed' = 'pending';
    if (item.status === 'pending') {
      newStatus = 'in-progress';
    } else if (item.status === 'in-progress') {
      newStatus = 'blocked';
    } else if (item.status === 'blocked') {
      newStatus = 'on-hold';
    } else if (item.status === 'on-hold') {
      newStatus = 'completed';
    } else if (item.status === 'completed') {
      newStatus = 'pending';
    }
    onStatusChange?.(item.id, newStatus, item.type);
  };

  const getCheckboxStyle = () => {
    if (item.status === 'completed') {
      return 'bg-green-500 border-2 border-green-500 hover:bg-green-600';
    } else if (item.status === 'in-progress') {
      return 'bg-amber-500 border-2 border-amber-500 hover:bg-amber-600';
    } else if (item.status === 'blocked') {
      return 'bg-red-500 border-2 border-red-500 hover:bg-red-600';
    } else if (item.status === 'on-hold') {
      return 'bg-purple-500 border-2 border-purple-500 hover:bg-purple-600';
    } else {
      return 'border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:border-amber-400 dark:hover:border-amber-400';
    }
  };

  const getStatusLabel = () => {
    if (item.status === 'completed') {
      return { text: 'Completed', color: 'text-green-600 dark:text-green-400' };
    } else if (item.status === 'in-progress') {
      return { text: 'In Progress', color: 'text-amber-600 dark:text-amber-400' };
    } else if (item.status === 'blocked') {
      return { text: 'Blocked', color: 'text-red-600 dark:text-red-400' };
    } else if (item.status === 'on-hold') {
      return { text: 'On Hold', color: 'text-purple-600 dark:text-purple-400' };
    } else {
      return { text: 'Pending', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Checkbox */}
          <button
            onClick={handleStatusClick}
            title={`Status: ${getStatusLabel().text} (click to cycle)`}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${getCheckboxStyle()}`}
          >
            {item.status === 'completed' && (
              <CheckSquare className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
            )}
            {item.status === 'in-progress' && (
              <Clock className="w-3 h-3 text-white" />
            )}
            {item.status === 'blocked' && (
              <AlertCircle className="w-3 h-3 text-white" />
            )}
            {item.status === 'on-hold' && (
              <Pause className="w-3 h-3 text-white" />
            )}
          </button>

          {/* Title & Type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${
                item.status === 'completed' ? 'line-through opacity-60' : ''
              }`}>
                {item.title}
              </h3>
              {/* Task/Chore Type Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-2 ${
                item.type === 'chore'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {item.type === 'chore' ? '🏠 Chore' : '📋 Task'}
              </span>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 md:w-4 md:h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg z-20">
                {onViewDetails && item.type === 'task' && (
                  <button
                    onClick={() => {
                      onViewDetails(item);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 sm:py-2 text-left text-base sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit?.(item);
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!onViewDetails || item.type !== 'task' ? 'rounded-t-lg' : ''}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete?.(item.id, item.type);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${{
            'low': 'bg-blue-500',
            'medium': 'bg-yellow-500',
            'high': 'bg-orange-500',
            'urgent': 'bg-red-500'
          }[item.priority] || 'bg-gray-500'}`} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{item.priority}</span>
        </div>

        {/* Due Date */}
        {item.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
            <span>{new Date(item.due_date).toLocaleDateString()}</span>
            {isOverdue && <span className="font-semibold">Overdue</span>}
          </div>
        )}

        {/* Status Badge */}
        <span className={`px-2 py-0.5 text-white rounded-full capitalize ml-auto ${{
          'pending': 'bg-gray-500',
          'in-progress': 'bg-blue-500',
          'blocked': 'bg-red-500',
          'on-hold': 'bg-purple-500',
          'completed': 'bg-green-500'
        }[item.status] || 'bg-gray-500'}`}>
          {item.status.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
}

export function DraggableItemList({
  spaceId,
  initialItems,
  onItemClick,
  onItemsReorder,
  onStatusChange,
  onEdit,
  onDelete,
  onViewDetails,
}: DraggableItemListProps) {
  const [items, setItems] = useState<UnifiedItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update items when initialItems changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // Create new array with reordered items
    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(oldIndex, 1);
    reorderedItems.splice(newIndex, 0, movedItem);

    // Update sort_order for all affected items
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    // Update local state immediately for smooth UX
    setItems(updatedItems);
    hapticLight(); // Haptic feedback on successful drop

    // Update database with separate logic for tasks and chores
    try {
      const supabase = createClient();

      // Group updates by type
      const taskUpdates = updatedItems
        .filter(item => item.type === 'task')
        .map((item, index) =>
          supabase
            .from('tasks')
            .update({ sort_order: index, updated_at: new Date().toISOString() })
            .eq('id', item.id)
        );

      // For chores, check if sort_order column exists first
      const choreItems = updatedItems.filter(item => item.type === 'chore');
      const choreUpdates = [];

      if (choreItems.length > 0) {
        try {
          // Test if sort_order column exists by trying to read it
          const { error: testError } = await supabase
            .from('chores')
            .select('sort_order')
            .limit(1);

          if (!testError) {
            // Column exists, proceed with updates
            choreUpdates.push(
              ...choreItems.map((item, index) =>
                supabase
                  .from('chores')
                  .update({ sort_order: index, updated_at: new Date().toISOString() })
                  .eq('id', item.id)
              )
            );
          } else {
            console.log('🏠 sort_order column not found for chores, skipping chore reordering');
          }
        } catch (sortOrderError) {
          console.log('🏠 sort_order column not available for chores yet, skipping chore reordering');
        }
      }

      // Execute both task and chore updates
      await Promise.all([...taskUpdates, ...choreUpdates]);

      console.log('✅ Successfully updated sort order for available items');
    } catch (error) {
      console.error('❌ Error updating item order:', error);
      // Revert on error
      setItems(initialItems);
    }

    setActiveId(null);
  }

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No tasks or chores yet. Create your first item to get started!</p>
            </div>
          ) : (
            items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onItemClick={onItemClick}
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
        {activeItem ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl opacity-90">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {activeItem.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                activeItem.type === 'chore'
                  ? 'border-amber-500 text-amber-600 bg-amber-50'
                  : 'border-blue-500 text-blue-600 bg-blue-50'
              }`}>
                {activeItem.type === 'chore' ? '🏠 Chore' : '📋 Task'}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}