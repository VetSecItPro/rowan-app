'use client';

import { useState, useCallback } from 'react';
import type { ShoppingList } from '@/lib/services/shopping-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmDialogState = {
  isOpen: boolean;
  listId: string;
};

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseShoppingModalsReturn {
  // New/Edit list modal
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingList: ShoppingList | null;
  setEditingList: React.Dispatch<React.SetStateAction<ShoppingList | null>>;
  handleOpenNewListModal: () => void;
  handleCloseModal: () => void;
  handleEditList: (list: ShoppingList) => void;

  // Template picker modal
  showTemplatePicker: boolean;
  setShowTemplatePicker: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenTemplatePicker: () => void;

  // Save template modal
  showTemplateModal: boolean;
  setShowTemplateModal: React.Dispatch<React.SetStateAction<boolean>>;
  listForTemplate: ShoppingList | null;
  setListForTemplate: React.Dispatch<React.SetStateAction<ShoppingList | null>>;
  handleSaveAsTemplate: (list: ShoppingList) => void;
  handleCloseTemplateModal: () => void;

  // Schedule trip modal
  showScheduleTripModal: boolean;
  setShowScheduleTripModal: React.Dispatch<React.SetStateAction<boolean>>;
  listToSchedule: ShoppingList | null;
  setListToSchedule: React.Dispatch<React.SetStateAction<ShoppingList | null>>;
  handleScheduleTrip: (list: ShoppingList) => void;
  handleCloseScheduleTripModal: () => void;

  // Confirm dialog
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  handleCloseConfirmDialog: () => void;

  // Start fresh (open create modal from template picker)
  handleStartFresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useShoppingModals(): UseShoppingModalsReturn {
  // ─── New/Edit list modal state ─────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  // ─── Template picker modal state ───────────────────────────────────────────
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // ─── Save template modal state ─────────────────────────────────────────────
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [listForTemplate, setListForTemplate] = useState<ShoppingList | null>(null);

  // ─── Schedule trip modal state ─────────────────────────────────────────────
  const [showScheduleTripModal, setShowScheduleTripModal] = useState(false);
  const [listToSchedule, setListToSchedule] = useState<ShoppingList | null>(null);

  // ─── Confirm dialog state ──────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    listId: '',
  });

  // ─── New/Edit list modal handlers ──────────────────────────────────────────

  const handleOpenNewListModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingList(null);
  }, []);

  const handleEditList = useCallback((list: ShoppingList) => {
    // Prevent actions on optimistic lists (temp IDs)
    if (list.id.startsWith('temp-')) {
      // Toast is handled in the handlers hook via showInfo import
      return;
    }

    setEditingList(list);
    setIsModalOpen(true);
  }, []);

  // ─── Template picker handlers ──────────────────────────────────────────────

  const handleOpenTemplatePicker = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  // ─── Save template handlers ────────────────────────────────────────────────

  const handleSaveAsTemplate = useCallback((list: ShoppingList) => {
    // Prevent actions on optimistic lists (temp IDs)
    if (list.id.startsWith('temp-')) {
      return;
    }

    setListForTemplate(list);
    setShowTemplateModal(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    setShowTemplateModal(false);
    setListForTemplate(null);
  }, []);

  // ─── Schedule trip handlers ────────────────────────────────────────────────

  const handleScheduleTrip = useCallback((list: ShoppingList) => {
    // Prevent actions on optimistic lists (temp IDs)
    if (list.id.startsWith('temp-')) {
      return;
    }

    setListToSchedule(list);
    setShowScheduleTripModal(true);
  }, []);

  const handleCloseScheduleTripModal = useCallback(() => {
    setShowScheduleTripModal(false);
    setListToSchedule(null);
  }, []);

  // ─── Confirm dialog handlers ───────────────────────────────────────────────

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog({ isOpen: false, listId: '' });
  }, []);

  // ─── Start fresh handler ───────────────────────────────────────────────────

  const handleStartFresh = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  return {
    // New/Edit list modal
    isModalOpen,
    setIsModalOpen,
    editingList,
    setEditingList,
    handleOpenNewListModal,
    handleCloseModal,
    handleEditList,

    // Template picker modal
    showTemplatePicker,
    setShowTemplatePicker,
    handleOpenTemplatePicker,

    // Save template modal
    showTemplateModal,
    setShowTemplateModal,
    listForTemplate,
    setListForTemplate,
    handleSaveAsTemplate,
    handleCloseTemplateModal,

    // Schedule trip modal
    showScheduleTripModal,
    setShowScheduleTripModal,
    listToSchedule,
    setListToSchedule,
    handleScheduleTrip,
    handleCloseScheduleTripModal,

    // Confirm dialog
    confirmDialog,
    setConfirmDialog,
    handleCloseConfirmDialog,

    // Start fresh
    handleStartFresh,
  };
}
