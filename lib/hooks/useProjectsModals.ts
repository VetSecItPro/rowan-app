'use client';

import { useState, useCallback } from 'react';
import type { Project } from '@/lib/services/project-tracking-service';
import type { Expense } from '@/lib/services/budgets-service';
import type { Bill } from '@/lib/services/bills-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmDialogState = {
  isOpen: boolean;
  action: 'delete-project' | 'delete-expense' | 'delete-bill';
  id: string;
};

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseProjectsModalsReturn {
  // Project modal
  isProjectModalOpen: boolean;
  setIsProjectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingProject: Project | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Project | null>>;
  handleOpenProjectModal: () => void;
  handleCloseProjectModal: () => void;
  handleEditProject: (project: Project) => void;

  // Expense modal
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingExpense: Expense | null;
  setEditingExpense: React.Dispatch<React.SetStateAction<Expense | null>>;
  handleOpenExpenseModal: () => void;
  handleCloseExpenseModal: () => void;
  handleEditExpense: (expense: Expense) => void;

  // Budget modal
  isBudgetModalOpen: boolean;
  setIsBudgetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenBudgetModal: () => void;
  handleCloseBudgetModal: () => void;

  // Bill modal
  isBillModalOpen: boolean;
  setIsBillModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingBill: Bill | null;
  setEditingBill: React.Dispatch<React.SetStateAction<Bill | null>>;
  handleOpenBillModal: () => void;
  handleCloseBillModal: () => void;
  handleEditBill: (bill: Bill) => void;

  // Template modal
  isTemplateModalOpen: boolean;
  setIsTemplateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenTemplateModal: () => void;
  handleCloseTemplateModal: () => void;

  // Receipt modal
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenReceiptModal: () => void;
  handleCloseReceiptModal: () => void;

  // Confirm dialog
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // CTA button orchestration (dispatches to correct modal based on activeTab)
  handleCTAClick: (activeTab: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectsModals(): UseProjectsModalsReturn {
  // ─── Project modal state ──────────────────────────────────────────────────
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // ─── Expense modal state ──────────────────────────────────────────────────
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // ─── Budget modal state ───────────────────────────────────────────────────
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // ─── Bill modal state ─────────────────────────────────────────────────────
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // ─── Template modal state ─────────────────────────────────────────────────
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // ─── Receipt modal state ──────────────────────────────────────────────────
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // ─── Confirm dialog state ─────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: 'delete-project',
    id: '',
  });

  // ─── Project modal handlers ───────────────────────────────────────────────

  const handleOpenProjectModal = useCallback(() => {
    setIsProjectModalOpen(true);
  }, []);

  const handleCloseProjectModal = useCallback(() => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  }, []);

  // ─── Expense modal handlers ───────────────────────────────────────────────

  const handleOpenExpenseModal = useCallback(() => {
    setIsExpenseModalOpen(true);
  }, []);

  const handleCloseExpenseModal = useCallback(() => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  }, []);

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  }, []);

  // ─── Budget modal handlers ────────────────────────────────────────────────

  const handleOpenBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(true);
  }, []);

  const handleCloseBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(false);
  }, []);

  // ─── Bill modal handlers ──────────────────────────────────────────────────

  const handleOpenBillModal = useCallback(() => {
    setIsBillModalOpen(true);
  }, []);

  const handleCloseBillModal = useCallback(() => {
    setIsBillModalOpen(false);
    setEditingBill(null);
  }, []);

  const handleEditBill = useCallback((bill: Bill) => {
    setEditingBill(bill);
    setIsBillModalOpen(true);
  }, []);

  // ─── Template modal handlers ──────────────────────────────────────────────

  const handleOpenTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  // ─── Receipt modal handlers ───────────────────────────────────────────────

  const handleOpenReceiptModal = useCallback(() => {
    setIsReceiptModalOpen(true);
  }, []);

  const handleCloseReceiptModal = useCallback(() => {
    setIsReceiptModalOpen(false);
  }, []);

  // ─── CTA button orchestration ─────────────────────────────────────────────

  const handleCTAClick = useCallback((activeTab: string) => {
    if (activeTab === 'projects') setIsProjectModalOpen(true);
    else if (activeTab === 'budgets') setIsBudgetModalOpen(true);
    else if (activeTab === 'bills') setIsBillModalOpen(true);
    else if (activeTab === 'receipts') setIsReceiptModalOpen(true);
    else setIsExpenseModalOpen(true);
  }, []);

  return {
    // Project modal
    isProjectModalOpen,
    setIsProjectModalOpen,
    editingProject,
    setEditingProject,
    handleOpenProjectModal,
    handleCloseProjectModal,
    handleEditProject,

    // Expense modal
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    editingExpense,
    setEditingExpense,
    handleOpenExpenseModal,
    handleCloseExpenseModal,
    handleEditExpense,

    // Budget modal
    isBudgetModalOpen,
    setIsBudgetModalOpen,
    handleOpenBudgetModal,
    handleCloseBudgetModal,

    // Bill modal
    isBillModalOpen,
    setIsBillModalOpen,
    editingBill,
    setEditingBill,
    handleOpenBillModal,
    handleCloseBillModal,
    handleEditBill,

    // Template modal
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleOpenTemplateModal,
    handleCloseTemplateModal,

    // Receipt modal
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    handleOpenReceiptModal,
    handleCloseReceiptModal,

    // Confirm dialog
    confirmDialog,
    setConfirmDialog,

    // CTA button orchestration
    handleCTAClick,
  };
}
