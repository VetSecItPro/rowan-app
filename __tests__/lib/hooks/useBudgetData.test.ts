/**
 * Unit tests for lib/hooks/useBudgetData.ts (PR14). Covers the budget/expense
 * logic that moved here from the former conflated useProjectsData: expense
 * filtering, expense stats, and the CRUD action wiring.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBudgetData } from '@/lib/hooks/useBudgetData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1' },
    user: { id: 'user-1' },
  })),
}));

const getExpenses = vi.fn().mockResolvedValue([]);
const getBudget = vi.fn().mockResolvedValue({ monthly_budget: 0 });
const getBudgetStats = vi.fn().mockResolvedValue({ monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 });
const createExpense = vi.fn().mockResolvedValue({ id: 'e1' });
const updateExpense = vi.fn().mockResolvedValue(undefined);
const deleteExpense = vi.fn().mockResolvedValue(undefined);
const setBudgetSvc = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getExpenses: (...a: unknown[]) => getExpenses(...a),
    getBudget: (...a: unknown[]) => getBudget(...a),
    getBudgetStats: (...a: unknown[]) => getBudgetStats(...a),
    createExpense: (...a: unknown[]) => createExpense(...a),
    updateExpense: (...a: unknown[]) => updateExpense(...a),
    deleteExpense: (...a: unknown[]) => deleteExpense(...a),
    setBudget: (...a: unknown[]) => setBudgetSvc(...a),
  },
}));

vi.mock('@/lib/services/budget-alerts-service', () => ({
  budgetAlertsService: { checkBudgetAfterExpenseChange: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/services/budget-templates-service', () => ({
  budgetTemplatesService: {
    getBudgetTemplates: vi.fn().mockResolvedValue([]),
    getTemplateCategories: vi.fn().mockResolvedValue([]),
    applyTemplate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

describe('useBudgetData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExpenses.mockResolvedValue([]);
  });

  it('filters expenses by search query (title match) and computes stats', async () => {
    getExpenses.mockResolvedValue([
      { id: '1', title: 'Groceries', amount: 100, status: 'paid' },
      { id: '2', title: 'Gas', amount: 50, status: 'pending' },
    ]);
    const { result } = renderHook(() => useBudgetData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Stats over all expenses.
    expect(result.current.expenseStats).toEqual({ totalCount: 2, pendingCount: 1, paidCount: 1, totalAmount: 150 });

    act(() => result.current.setSearchQuery('groc'));
    expect(result.current.filteredExpenses.map((e) => e.id)).toEqual(['1']);
  });

  it('saveExpense creates a new expense when no editingId is given', async () => {
    const { result } = renderHook(() => useBudgetData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.saveExpense({ space_id: 'space-1', title: 'Lunch', amount: 12 } as never);
    });
    expect(createExpense).toHaveBeenCalled();
    expect(updateExpense).not.toHaveBeenCalled();
  });

  it('saveExpense updates when an editingId is given', async () => {
    const { result } = renderHook(() => useBudgetData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.saveExpense({ space_id: 'space-1', title: 'Lunch', amount: 12 } as never, 'e9');
    });
    expect(updateExpense).toHaveBeenCalledWith('e9', expect.anything());
    expect(createExpense).not.toHaveBeenCalled();
  });

  it('changeExpenseStatus updates the expense status', async () => {
    const { result } = renderHook(() => useBudgetData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.changeExpenseStatus('e1', 'paid');
    });
    expect(updateExpense).toHaveBeenCalledWith('e1', { status: 'paid' });
  });

  it('setBudget persists the monthly budget for the space', async () => {
    const { result } = renderHook(() => useBudgetData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setBudget(4000);
    });
    expect(setBudgetSvc).toHaveBeenCalledWith({ space_id: 'space-1', monthly_budget: 4000 }, 'user-1');
  });
});
