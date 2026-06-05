'use client';

import { useCallback } from 'react';
import { projectsOnlyService, type CreateProjectInput } from '@/lib/services/projects-service';
import type { Project } from '@/lib/services/project-tracking-service';
import type { ConfirmDialogState } from '@/lib/hooks/useProjectsModals';
import { logger } from '@/lib/logger';

// ─── Dependencies interface ───────────────────────────────────────────────────
//
// PR14: expense/bill/budget/template handlers moved to useBudgetData. This hook
// now provides project CRUD only.

export interface UseProjectsHandlersDeps {
  editingProject: Project | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Project | null>>;
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  loadData: () => Promise<void>;
}

export interface UseProjectsHandlersReturn {
  handleCreateProject: (data: CreateProjectInput) => Promise<Project | null>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
}

/** Provides CRUD handlers for household (home-renovation) projects. */
export function useProjectsHandlers(deps: UseProjectsHandlersDeps): UseProjectsHandlersReturn {
  const { editingProject, setEditingProject, confirmDialog, setConfirmDialog, loadData } = deps;

  const handleCreateProject = useCallback(async (data: CreateProjectInput): Promise<Project | null> => {
    try {
      const project = editingProject
        ? await projectsOnlyService.updateProject(editingProject.id, data)
        : await projectsOnlyService.createProject(data);
      loadData();
      setEditingProject(null);
      return project;
    } catch (error) {
      logger.error('Failed to save project:', error, { component: 'use-projects-handlers', action: 'save_project' });
      throw error;
    }
  }, [editingProject, loadData, setEditingProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-project', id: projectId });
  }, [setConfirmDialog]);

  const handleConfirmDelete = useCallback(async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, action: 'delete-project', id: '' });
    try {
      await projectsOnlyService.deleteProject(id);
      loadData();
    } catch (error) {
      logger.error('Failed to delete project:', error, { component: 'use-projects-handlers', action: 'delete_project' });
    }
  }, [confirmDialog, loadData, setConfirmDialog]);

  return {
    handleCreateProject,
    handleDeleteProject,
    handleConfirmDelete,
  };
}
