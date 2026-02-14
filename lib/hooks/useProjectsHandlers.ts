'use client';

import { useCallback } from 'react';
import { projectsOnlyService, type CreateProjectInput } from '@/lib/services/projects-service';
import { projectsService, type CreateExpenseInput } from '@/lib/services/budgets-service';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';
import { billsService, type CreateBillInput } from '@/lib/services/bills-service';
import { budgetTemplatesService } from '@/lib/services/budget-templates-service';
import type { Project } from '@/lib/services/project-tracking-service';
import type { Expense } from '@/lib/services/budgets-service';
import type { Bill } from '@/lib/services/bills-service';
import type { ConfirmDialogState } from '@/lib/hooks/useProjectsModals';
import { logger } from '@/lib/logger';

// ─── Dependencies interface ───────────────────────────────────────────────────

export interface UseProjectsHandlersDeps {
  // Auth
  user: { id: string; email?: string } | null;
  currentSpace: { id: string } | null;

  // Modal editing state (from useProjectsModals)
  editingProject: Project | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Project | null>>;
  editingExpense: Expense | null;
  setEditingExpense: React.Dispatch<React.SetStateAction<Expense | null>>;
  editingBill: Bill | null;
  setEditingBill: React.Dispatch<React.SetStateAction<Bill | null>>;

  // Confirm dialog state (from useProjectsModals)
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // Data refresh (from useProjectsData)
  loadData: () => Promise<void>;
}

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseProjectsHandlersReturn {
  handleCreateProject: (data: CreateProjectInput) => Promise<Project | null>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleCreateExpense: (data: CreateExpenseInput) => Promise<void>;
  handleDeleteExpense: (expenseId: string) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
  handleStatusChange: (expenseId: string, newStatus: 'pending' | 'paid') => Promise<void>;
  handleSetBudget: (amount: number) => Promise<void>;
  handleCreateBill: (data: CreateBillInput) => Promise<void>;
  handleDeleteBill: (billId: string) => Promise<void>;
  handleMarkBillPaid: (billId: string) => Promise<void>;
  handleApplyTemplate: (templateId: string, monthlyIncome: number) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Provides CRUD handlers for household projects and their tasks */
export function useProjectsHandlers(deps: UseProjectsHandlersDeps): UseProjectsHandlersReturn {
  const {
    user,
    currentSpace,
    editingProject,
    setEditingProject,
    editingExpense,
    setEditingExpense,
    editingBill,
    setEditingBill,
    confirmDialog,
    setConfirmDialog,
    loadData,
  } = deps;

  const handleCreateProject = useCallback(async (data: CreateProjectInput): Promise<Project | null> => {
    try {
      let project: Project;
      if (editingProject) {
        project = await projectsOnlyService.updateProject(editingProject.id, data);
      } else {
        project = await projectsOnlyService.createProject(data);
      }
      loadData();
      setEditingProject(null);
      return project;
    } catch (error) {
      logger.error('Failed to save project:', error, { component: 'page', action: 'execution' });
      throw error;
    }
  }, [editingProject, loadData, setEditingProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-project', id: projectId });
  }, [setConfirmDialog]);

  const handleCreateExpense = useCallback(async (data: CreateExpenseInput) => {
    if (!currentSpace) return;

    try {
      if (editingExpense) {
        await projectsService.updateExpense(editingExpense.id, data);
      } else {
        await projectsService.createExpense(data);
      }

      // Check budget thresholds and trigger alerts if needed
      await budgetAlertsService.checkBudgetAfterExpenseChange(currentSpace.id);

      loadData();
      setEditingExpense(null);
    } catch (error) {
      logger.error('Failed to save expense:', error, { component: 'page', action: 'execution' });
    }
  }, [editingExpense, loadData, currentSpace, setEditingExpense]);

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-expense', id: expenseId });
  }, [setConfirmDialog]);

  const handleConfirmDelete = useCallback(async () => {
    const { action, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, action: 'delete-project', id: '' });

    try {
      if (action === 'delete-project') {
        await projectsOnlyService.deleteProject(id);
      } else if (action === 'delete-expense') {
        await projectsService.deleteExpense(id);
      } else if (action === 'delete-bill') {
        await billsService.deleteBill(id);
      }
      loadData();
    } catch (error) {
      logger.error('Failed to ${action}:', error, { component: 'page', action: 'execution' });
    }
  }, [confirmDialog, loadData, setConfirmDialog]);

  const handleStatusChange = useCallback(async (expenseId: string, newStatus: 'pending' | 'paid') => {
    try {
      await projectsService.updateExpense(expenseId, { status: newStatus });
      loadData();
    } catch (error) {
      logger.error('Failed to update expense status:', error, { component: 'page', action: 'execution' });
    }
  }, [loadData]);

  const handleSetBudget = useCallback(async (amount: number) => {
    if (!currentSpace || !user) return;
    try {
      await projectsService.setBudget({ space_id: currentSpace.id, monthly_budget: amount }, user.id);
      loadData();
    } catch (error) {
      logger.error('Failed to set budget:', error, { component: 'page', action: 'execution' });
    }
  }, [currentSpace, user, loadData]);

  const handleCreateBill = useCallback(async (data: CreateBillInput) => {
    if (!user) return;

    try {
      if (editingBill) {
        await billsService.updateBill(editingBill.id, data);
      } else {
        await billsService.createBill(data, user.id);
      }
      loadData();
      setEditingBill(null);
    } catch (error) {
      logger.error('Failed to save bill:', error, { component: 'page', action: 'execution' });
    }
  }, [editingBill, loadData, user, setEditingBill]);

  const handleDeleteBill = useCallback(async (billId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-bill', id: billId });
  }, [setConfirmDialog]);

  const handleMarkBillPaid = useCallback(async (billId: string) => {
    try {
      await billsService.markBillAsPaid(billId, true);
      loadData();
    } catch (error) {
      logger.error('Failed to mark bill as paid:', error, { component: 'page', action: 'execution' });
    }
  }, [loadData]);

  const handleApplyTemplate = useCallback(async (templateId: string, monthlyIncome: number) => {
    if (!currentSpace) return;

    try {
      await budgetTemplatesService.applyTemplate({
        space_id: currentSpace.id,
        template_id: templateId,
        monthly_income: monthlyIncome,
      });
      loadData();
    } catch (error) {
      logger.error('Failed to apply budget template:', error, { component: 'page', action: 'execution' });
    }
  }, [currentSpace, loadData]);

  return {
    handleCreateProject,
    handleDeleteProject,
    handleCreateExpense,
    handleDeleteExpense,
    handleConfirmDelete,
    handleStatusChange,
    handleSetBudget,
    handleCreateBill,
    handleDeleteBill,
    handleMarkBillPaid,
    handleApplyTemplate,
  };
}
