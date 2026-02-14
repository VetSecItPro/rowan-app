'use client';

import { useState, useCallback } from 'react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarModalsReturn {
  // New/Edit event modal
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingEvent: CalendarEvent | null;
  setEditingEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;

  // Event detail modal
  detailEvent: CalendarEvent | null;
  setDetailEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;

  // Event proposal modal
  isProposalModalOpen: boolean;
  setIsProposalModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Quick add modal
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Template library modal
  isTemplateLibraryOpen: boolean;
  setIsTemplateLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Bulk manager modal
  isBulkManagerOpen: boolean;
  setIsBulkManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Confirm dialog
  confirmDialog: { isOpen: boolean; eventId: string };
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; eventId: string }>>;

  // Unified item preview modal (Phase 9)
  selectedUnifiedItem: UnifiedCalendarItem | null;
  setSelectedUnifiedItem: React.Dispatch<React.SetStateAction<UnifiedCalendarItem | null>>;
  isPreviewModalOpen: boolean;
  setIsPreviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Orchestration helpers
  closeAllModals: () => void;
  openModalForAction: (action: 'quick-add' | 'templates' | 'propose' | 'new-event') => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Manages open/close state for calendar-related modals and detail views */
export function useCalendarModals(): CalendarModalsReturn {
  // New/Edit event modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Event detail modal
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  // Event proposal modal
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Quick add modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Template library modal
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);

  // Bulk manager modal
  const [isBulkManagerOpen, setIsBulkManagerOpen] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, eventId: '' });

  // Unified item preview modal (Phase 9)
  const [selectedUnifiedItem, setSelectedUnifiedItem] = useState<UnifiedCalendarItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Orchestration helpers
  // ---------------------------------------------------------------------------

  /** Close all modals at once (e.g., for Escape key shortcut) */
  const closeAllModals = useCallback(() => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setDetailEvent(null);
    setIsProposalModalOpen(false);
    setIsQuickAddOpen(false);
    setIsTemplateLibraryOpen(false);
    setIsBulkManagerOpen(false);
    setConfirmDialog({ isOpen: false, eventId: '' });
    setIsPreviewModalOpen(false);
    setSelectedUnifiedItem(null);
  }, []);

  /** Open the correct modal for the active header action button */
  const openModalForAction = useCallback((action: 'quick-add' | 'templates' | 'propose' | 'new-event') => {
    if (action === 'quick-add') setIsQuickAddOpen(true);
    else if (action === 'templates') setIsTemplateLibraryOpen(true);
    else if (action === 'propose') setIsProposalModalOpen(true);
    else setIsModalOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // New/Edit event modal
    isModalOpen,
    setIsModalOpen,
    editingEvent,
    setEditingEvent,

    // Event detail modal
    detailEvent,
    setDetailEvent,

    // Event proposal modal
    isProposalModalOpen,
    setIsProposalModalOpen,

    // Quick add modal
    isQuickAddOpen,
    setIsQuickAddOpen,

    // Template library modal
    isTemplateLibraryOpen,
    setIsTemplateLibraryOpen,

    // Bulk manager modal
    isBulkManagerOpen,
    setIsBulkManagerOpen,

    // Confirm dialog
    confirmDialog,
    setConfirmDialog,

    // Unified item preview modal
    selectedUnifiedItem,
    setSelectedUnifiedItem,
    isPreviewModalOpen,
    setIsPreviewModalOpen,

    // Orchestration helpers
    closeAllModals,
    openModalForAction,
  };
}
