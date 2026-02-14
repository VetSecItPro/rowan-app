'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { logger } from '@/lib/logger';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
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
import { GripVertical, Clock, AlertCircle, MoreVertical, CheckSquare, Pause } from 'lucide-react';
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
  onItemsReorder?: (items: UnifiedItem[]) => void;
  onStatusChange?: (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => void;
  onEdit?: (item: UnifiedItem) => void;
  onDelete?: (itemId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (item: UnifiedItem) => void;
}

interface SortableItemProps {
  item: UnifiedItem;
  onStatusChange?: (itemId: string, status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed', type?: 'task' | 'chore') => void;
  onEdit?: (item: UnifiedItem) => void;
  onDelete?: (itemId: string, type?: 'task' | 'chore') => void;
  onViewDetails?: (item: UnifiedItem) => void;
}

function SortableItem({ item, onStatusChange, onEdit, onDelete, onViewDetails }: SortableItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160, // 160px = w-40 menu width
      });
    }
  }, []);

  const handleMenuToggle = () => {
    if (!showMenu) {
      updateMenuPosition();
    }
    setShowMenu(!showMenu);
  };

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
      return 'border-2 border-gray-600 bg-transparent hover:border-amber-400';
    }
  };

  const getStatusLabel = () => {
    if (item.status === 'completed') {
      return { text: 'Completed', color: 'text-green-400' };
    } else if (item.status === 'in-progress') {
      return { text: 'In Progress', color: 'text-amber-400' };
    } else if (item.status === 'blocked') {
      return { text: 'Blocked', color: 'text-red-400' };
    } else if (item.status === 'on-hold') {
      return { text: 'On Hold', color: 'text-purple-400' };
    } else {
      return { text: 'Pending', color: 'text-gray-400' };
    }
  };

  const priorityColor = {
    'low': 'bg-blue-500',
    'medium': 'bg-yellow-500',
    'high': 'bg-orange-500',
    'urgent': 'bg-red-500'
  }[item.priority] || 'bg-gray-500';

  const statusLabel = getStatusLabel();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all duration-200"
    >
      {/* Main row - compact single line */}
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-manipulation"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={handleStatusClick}
          title={`Status: ${statusLabel.text}`}
          className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center transition-colors ${getCheckboxStyle()}`}
        >
          {item.status === 'completed' && <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
          {item.status === 'in-progress' && <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
          {item.status === 'blocked' && <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
          {item.status === 'on-hold' && <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
        </button>

        {/* Title */}
        <h3 className={`flex-1 min-w-0 text-sm font-medium text-white truncate ${
          item.status === 'completed' ? 'line-through opacity-60' : ''
        }`}>
          {item.title}
        </h3>

        {/* Type Badge */}
        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
          item.type === 'chore'
            ? 'text-amber-400 bg-amber-900/30'
            : 'text-blue-400 bg-blue-900/30'
        }`}>
          {item.type === 'chore' ? 'Chore' : 'Task'}
        </span>

        {/* Priority dot */}
        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${priorityColor}`} title={`${item.priority} priority`} />

        {/* Status badge */}
        <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
          item.status === 'completed'
            ? 'bg-green-900/30 text-green-400'
            : item.status === 'in-progress'
            ? 'bg-amber-900/30 text-amber-400'
            : item.status === 'blocked'
            ? 'bg-red-900/30 text-red-400'
            : item.status === 'on-hold'
            ? 'bg-purple-900/30 text-purple-400'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {item.status === 'in-progress' ? 'Active' : item.status === 'on-hold' ? 'Hold' : item.status === 'completed' ? 'Done' : item.status === 'blocked' ? 'Blocked' : 'Pending'}
        </span>

        {/* Menu button */}
        <div className="flex-shrink-0">
          <button
            ref={menuButtonRef}
            onClick={handleMenuToggle}
            className="p-1 text-gray-400 hover:text-gray-300 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && typeof document !== 'undefined' && createPortal(
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} aria-hidden="true" />
              <div
                className="fixed w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[70] overflow-hidden"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                {onViewDetails && item.type === 'task' && (
                  <button
                    onClick={() => { onViewDetails(item); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => { onEdit?.(item); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onDelete?.(item.id, item.type); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-700"
                >
                  Delete
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>

      {/* Description + Meta row */}
      {(item.description || item.due_date) && (
        <div className="mt-1 ml-12 sm:ml-14 flex items-center gap-2 text-[11px] text-gray-400">
          {item.description && (
            <span className="truncate flex-1">{item.description}</span>
          )}
          {item.due_date && (
            <span className={`flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {isOverdue && ' !'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders a drag-and-drop reorderable list of task items. */
export function DraggableItemList({
  spaceId,
  initialItems,
  onItemsReorder,
  onStatusChange,
  onEdit,
  onDelete,
  onViewDetails,
}: DraggableItemListProps) {
  void spaceId;
  const [items, setItems] = useState<UnifiedItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press-and-hold to start drag (prevents accidental drags while scrolling)
        tolerance: 5, // Allow 5px of movement during delay
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
    onItemsReorder?.(updatedItems);
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
            logger.info('🏠 sort_order column not found for chores, skipping chore reordering', { component: 'DraggableItemList' });
          }
        } catch {
          logger.info('🏠 sort_order column not available for chores yet, skipping chore reordering', { component: 'DraggableItemList' });
        }
      }

      // Execute both task and chore updates
      await Promise.all([...taskUpdates, ...choreUpdates]);

      logger.info('✅ Successfully updated sort order for available items', { component: 'DraggableItemList' });
    } catch (error) {
      logger.error('❌ Error updating item order:', error, { component: 'DraggableItemList', action: 'component_action' });
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
            <div className="text-center py-12 text-gray-400">
              <p>No tasks or chores yet. Create your first item to get started!</p>
            </div>
          ) : (
            items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
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
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800 border border-gray-700 shadow-2xl opacity-95">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <h3 className="flex-1 text-sm font-medium text-white truncate">
              {activeItem.title}
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              activeItem.type === 'chore'
                ? 'text-amber-400 bg-amber-900/30'
                : 'text-blue-400 bg-blue-900/30'
            }`}>
              {activeItem.type === 'chore' ? 'Chore' : 'Task'}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
