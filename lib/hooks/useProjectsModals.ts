'use client';

import { useState, useCallback } from 'react';
import type { Project } from '@/lib/services/project-tracking-service';

// ─── Types ────────────────────────────────────────────────────────────────────
//
// PR14: budget/expense/bill/template/receipt modal state moved to the /budget
// hub clients. This hook now manages only the project create/edit modal + the
// project delete-confirm dialog.

export type ConfirmDialogState = {
  isOpen: boolean;
  action: 'delete-project';
  id: string;
};

export interface UseProjectsModalsReturn {
  isProjectModalOpen: boolean;
  setIsProjectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingProject: Project | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Project | null>>;
  handleCloseProjectModal: () => void;
  handleEditProject: (project: Project) => void;

  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
}

/** Manages the project create/edit modal and the project delete-confirm dialog. */
export function useProjectsModals(): UseProjectsModalsReturn {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: 'delete-project',
    id: '',
  });

  const handleCloseProjectModal = useCallback(() => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  }, []);

  return {
    isProjectModalOpen,
    setIsProjectModalOpen,
    editingProject,
    setEditingProject,
    handleCloseProjectModal,
    handleEditProject,
    confirmDialog,
    setConfirmDialog,
  };
}
