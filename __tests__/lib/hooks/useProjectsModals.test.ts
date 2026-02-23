/**
 * Unit tests for lib/hooks/useProjectsModals.ts
 *
 * Tests project, expense, budget, bill, template, and receipt modal state management.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectsModals } from '@/lib/hooks/useProjectsModals';
import type { Project } from '@/lib/services/project-tracking-service';

const mockProject = { id: 'proj-1', title: 'Test Project' } as Project;

describe('useProjectsModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useProjectsModals());

    expect(result.current.isProjectModalOpen).toBe(false);
    expect(result.current.editingProject).toBeNull();
    expect(result.current.isExpenseModalOpen).toBe(false);
    expect(result.current.editingExpense).toBeNull();
    expect(result.current.isBudgetModalOpen).toBe(false);
    expect(result.current.isBillModalOpen).toBe(false);
    expect(result.current.editingBill).toBeNull();
    expect(result.current.isTemplateModalOpen).toBe(false);
    expect(result.current.isReceiptModalOpen).toBe(false);
    expect(result.current.confirmDialog).toEqual({
      isOpen: false,
      action: 'delete-project',
      id: '',
    });
  });

  it('handleOpenProjectModal should open project modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenProjectModal());

    expect(result.current.isProjectModalOpen).toBe(true);
  });

  it('handleCloseProjectModal should close and clear editing project', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleEditProject(mockProject));
    act(() => result.current.handleCloseProjectModal());

    expect(result.current.isProjectModalOpen).toBe(false);
    expect(result.current.editingProject).toBeNull();
  });

  it('handleEditProject should set editing project and open modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleEditProject(mockProject));

    expect(result.current.editingProject).toEqual(mockProject);
    expect(result.current.isProjectModalOpen).toBe(true);
  });

  it('handleOpenExpenseModal should open expense modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenExpenseModal());

    expect(result.current.isExpenseModalOpen).toBe(true);
  });

  it('handleOpenBudgetModal should open budget modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenBudgetModal());

    expect(result.current.isBudgetModalOpen).toBe(true);
  });

  it('handleCloseBudgetModal should close budget modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenBudgetModal());
    act(() => result.current.handleCloseBudgetModal());

    expect(result.current.isBudgetModalOpen).toBe(false);
  });

  it('handleOpenBillModal should open bill modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenBillModal());

    expect(result.current.isBillModalOpen).toBe(true);
  });

  it('handleOpenTemplateModal should open template modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenTemplateModal());

    expect(result.current.isTemplateModalOpen).toBe(true);
  });

  it('handleOpenReceiptModal should open receipt modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleOpenReceiptModal());

    expect(result.current.isReceiptModalOpen).toBe(true);
  });

  it('handleCTAClick projects should open project modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleCTAClick('projects'));

    expect(result.current.isProjectModalOpen).toBe(true);
  });

  it('handleCTAClick budgets should open budget modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleCTAClick('budgets'));

    expect(result.current.isBudgetModalOpen).toBe(true);
  });

  it('handleCTAClick bills should open bill modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleCTAClick('bills'));

    expect(result.current.isBillModalOpen).toBe(true);
  });

  it('handleCTAClick receipts should open receipt modal', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleCTAClick('receipts'));

    expect(result.current.isReceiptModalOpen).toBe(true);
  });

  it('handleCTAClick unknown tab should open expense modal as default', () => {
    const { result } = renderHook(() => useProjectsModals());

    act(() => result.current.handleCTAClick('other'));

    expect(result.current.isExpenseModalOpen).toBe(true);
  });
});
