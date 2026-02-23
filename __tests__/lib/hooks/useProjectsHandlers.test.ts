/**
 * Unit tests for lib/hooks/useProjectsHandlers.ts
 *
 * Tests CRUD handler function existence and basic delete confirmation flow.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectsHandlers } from '@/lib/hooks/useProjectsHandlers';
import type { UseProjectsHandlersDeps } from '@/lib/hooks/useProjectsHandlers';

vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: {
    createProject: vi.fn().mockResolvedValue({ id: 'proj-1', title: 'New Project' }),
    updateProject: vi.fn().mockResolvedValue({ id: 'proj-1', title: 'Updated' }),
    deleteProject: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    createExpense: vi.fn().mockResolvedValue({ id: 'exp-1' }),
    updateExpense: vi.fn().mockResolvedValue(undefined),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    setBudget: vi.fn().mockResolvedValue(undefined),
  },
  Expense: {},
  CreateExpenseInput: {},
}));

vi.mock('@/lib/services/budget-alerts-service', () => ({
  budgetAlertsService: {
    checkBudgetAlerts: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/bills-service', () => ({
  billsService: {
    createBill: vi.fn().mockResolvedValue({ id: 'bill-1' }),
    updateBill: vi.fn().mockResolvedValue(undefined),
    deleteBill: vi.fn().mockResolvedValue(undefined),
    markPaid: vi.fn().mockResolvedValue(undefined),
  },
  Bill: {},
  CreateBillInput: {},
}));

vi.mock('@/lib/services/budget-templates-service', () => ({
  budgetTemplatesService: {
    applyTemplate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildDeps(overrides: Partial<UseProjectsHandlersDeps> = {}): UseProjectsHandlersDeps {
  return {
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1' },
    editingProject: null,
    setEditingProject: vi.fn(),
    editingExpense: null,
    setEditingExpense: vi.fn(),
    editingBill: null,
    setEditingBill: vi.fn(),
    confirmDialog: { isOpen: false, action: 'delete-project', id: '' },
    setConfirmDialog: vi.fn(),
    loadData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useProjectsHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useProjectsHandlers(buildDeps()));

    expect(typeof result.current.handleCreateProject).toBe('function');
    expect(typeof result.current.handleDeleteProject).toBe('function');
    expect(typeof result.current.handleCreateExpense).toBe('function');
    expect(typeof result.current.handleDeleteExpense).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
    expect(typeof result.current.handleStatusChange).toBe('function');
    expect(typeof result.current.handleSetBudget).toBe('function');
    expect(typeof result.current.handleCreateBill).toBe('function');
    expect(typeof result.current.handleDeleteBill).toBe('function');
    expect(typeof result.current.handleMarkBillPaid).toBe('function');
    expect(typeof result.current.handleApplyTemplate).toBe('function');
  });

  it('handleConfirmDelete should not throw when confirmDialog is closed', async () => {
    const { result } = renderHook(() => useProjectsHandlers(buildDeps()));

    await expect(
      act(async () => result.current.handleConfirmDelete())
    ).resolves.not.toThrow();
  });
});
