import { useState, useCallback } from 'react';
import type { Task, Chore } from '@/lib/types';

// =============================================
// SHARED TYPES
// =============================================

export type TaskOrChore = Task & {
  type: 'task' | 'chore';
  frequency?: Chore['frequency'];
  notes?: Chore['notes'];
  sort_order: number;
};

/** Minimal input type accepted by openEditModal and openDetailsModal.
 * Covers both Task/Chore (from service layer) and UnifiedItem (from DraggableItemList). */
export type TaskOrChoreInput = {
  id: string;
  title: string;
  type?: 'task' | 'chore';
  status?: string;
  priority?: string;
  description?: string;
  due_date?: string;
  assigned_to?: string;
  sort_order?: number;
  frequency?: string;
  category?: string;
  notes?: string;
  space_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

// =============================================
// MODALS RETURN INTERFACE
// =============================================

export interface TasksModalsReturn {
  // Unified create/edit modal
  isUnifiedModalOpen: boolean;
  modalDefaultType: 'task' | 'chore';
  editingItem: TaskOrChore | null;

  // Details modal
  isDetailsModalOpen: boolean;
  selectedItem: TaskOrChore | null;

  // Template picker modal
  isTemplatePickerOpen: boolean;

  // Selected items for bulk actions
  selectedTaskIds: string[];

  // Modal actions
  openCreateModal: (type: 'task' | 'chore') => void;
  openEditModal: (item: TaskOrChoreInput) => void;
  closeUnifiedModal: () => void;
  openDetailsModal: (item: TaskOrChoreInput) => void;
  closeDetailsModal: () => void;
  openTemplatePicker: () => void;
  closeTemplatePicker: () => void;
  clearSelectedTaskIds: () => void;
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
}

// =============================================
// HOOK
// =============================================

/** Manages open/close state for task creation, editing, and detail view modals */
export function useTasksModals(): TasksModalsReturn {
  // Unified modal state (create/edit)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'task' | 'chore'>('task');
  const [editingItem, setEditingItem] = useState<TaskOrChore | null>(null);

  // Details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskOrChore | null>(null);

  // Template picker
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Modal actions
  const openCreateModal = useCallback((type: 'task' | 'chore') => {
    setModalDefaultType(type);
    setIsUnifiedModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: TaskOrChoreInput) => {
    setEditingItem({ ...item, type: item.type || 'task' } as TaskOrChore);
    setIsUnifiedModalOpen(true);
  }, []);

  const closeUnifiedModal = useCallback(() => {
    setIsUnifiedModalOpen(false);
    setEditingItem(null);
  }, []);

  const openDetailsModal = useCallback((item: TaskOrChoreInput) => {
    setSelectedItem({ ...item, type: item.type || 'task' } as TaskOrChore);
    setIsDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const openTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(true);
  }, []);

  const closeTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(false);
  }, []);

  const clearSelectedTaskIds = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  return {
    isUnifiedModalOpen,
    modalDefaultType,
    editingItem,
    isDetailsModalOpen,
    selectedItem,
    isTemplatePickerOpen,
    selectedTaskIds,
    openCreateModal,
    openEditModal,
    closeUnifiedModal,
    openDetailsModal,
    closeDetailsModal,
    openTemplatePicker,
    closeTemplatePicker,
    clearSelectedTaskIds,
    setSelectedTaskIds,
  };
}
