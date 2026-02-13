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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openEditModal: (item: any) => void;
  closeUnifiedModal: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openDetailsModal: (item: any) => void;
  closeDetailsModal: () => void;
  openTemplatePicker: () => void;
  closeTemplatePicker: () => void;
  clearSelectedTaskIds: () => void;
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
}

// =============================================
// HOOK
// =============================================

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = useCallback((item: any) => {
    setEditingItem({ ...item, type: item.type || 'task' } as TaskOrChore);
    setIsUnifiedModalOpen(true);
  }, []);

  const closeUnifiedModal = useCallback(() => {
    setIsUnifiedModalOpen(false);
    setEditingItem(null);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDetailsModal = useCallback((item: any) => {
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
