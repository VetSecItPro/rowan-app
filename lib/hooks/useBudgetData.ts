'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import {
  projectsService,
  type BudgetStats,
  type Expense,
  type CreateExpenseInput,
} from '@/lib/services/budgets-service';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';
import {
  budgetTemplatesService,
  type BudgetTemplate,
  type BudgetTemplateCategory,
} from '@/lib/services/budget-templates-service';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseStats = {
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  totalAmount: number;
};

export interface UseBudgetDataReturn {
  // Auth / context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  loading: boolean;

  // Budget
  currentBudget: number;
  budgetStats: BudgetStats;
  budgetTemplates: BudgetTemplate[];
  templateCategories: Record<string, BudgetTemplateCategory[]>;

  // Expenses
  expenses: Expense[];
  filteredExpenses: Expense[];
  expenseStats: ExpenseStats;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  // Actions
  loadData: () => Promise<void>;
  setBudget: (amount: number) => Promise<void>;
  applyTemplate: (templateId: string, monthlyIncome: number) => Promise<void>;
  saveExpense: (data: CreateExpenseInput, editingId?: string) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  changeExpenseStatus: (expenseId: string, newStatus: 'pending' | 'paid') => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────
//
// Budget + expense data layer for the /budget hub (PR14). Extracted from the
// former conflated useProjectsData so /budget and /projects no longer share a
// monolithic hook. Owns ONLY the financial domain: monthly budget, budget stats,
// templates, and the expenses list (with the expenses + budgets realtime
// subscriptions). Bills/recurring/vendors/goals each have their own pages and
// load their own data; projects (home-reno) stay in useProjectsData.
//
// Note: `projectsService` is the legacy export name of budgets-service — it is
// the BUDGET service, not the project service. Kept as-is to avoid a churny
// rename in this PR; the service itself is budget-domain.

/** Loads and manages the household budget + expenses for the /budget hub. */
export function useBudgetData(): UseBudgetDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();

  const [loading, setLoading] = useState(true);
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [budgetStats, setBudgetStats] = useState<BudgetStats>({
    monthlyBudget: 0,
    spentThisMonth: 0,
    remaining: 0,
    pendingBills: 0,
  });
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<Record<string, BudgetTemplateCategory[]>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [expensesData, budgetData, stats] = await Promise.all([
        projectsService.getExpenses(currentSpace.id),
        projectsService.getBudget(currentSpace.id),
        projectsService.getBudgetStats(currentSpace.id),
      ]);
      setExpenses(expensesData);
      setCurrentBudget(budgetData?.monthly_budget || 0);
      setBudgetStats(stats);
    } catch (error) {
      logger.error('Failed to load budget data:', error, { component: 'use-budget-data', action: 'load' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Budget templates (once on mount) ─────────────────────────────────────

  useEffect(() => {
    async function loadTemplates() {
      try {
        const templates = await budgetTemplatesService.getBudgetTemplates();
        setBudgetTemplates(templates);
        const categoriesMap: Record<string, BudgetTemplateCategory[]> = {};
        await Promise.all(
          templates.map(async (template) => {
            categoriesMap[template.id] = await budgetTemplatesService.getTemplateCategories(template.id);
          })
        );
        setTemplateCategories(categoriesMap);
      } catch (error) {
        logger.error('Failed to load budget templates:', error, { component: 'use-budget-data', action: 'load_templates' });
      }
    }
    loadTemplates();
  }, []);

  // ─── Budget-stats refresh helper ──────────────────────────────────────────

  const refreshBudgetStats = useCallback(async () => {
    if (!currentSpace) return;
    try {
      setBudgetStats(await projectsService.getBudgetStats(currentSpace.id));
    } catch (error) {
      logger.error('Failed to refresh budget stats:', error, { component: 'use-budget-data', action: 'refresh_stats' });
    }
  }, [currentSpace]);

  // ─── Realtime: expenses + budgets (single consolidated channel) ───────────

  useEffect(() => {
    if (!currentSpace) return;
    const supabase = createClient();
    const spaceFilter = `space_id=eq.${currentSpace.id}`;

    const channel = supabase
      .channel(`budget:${currentSpace.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          setExpenses(prev => [payload.new as Expense, ...prev]);
          refreshBudgetStats();
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expenses', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updated = payload.new as Expense;
          setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
          refreshBudgetStats();
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedId = (payload.old as { id: string }).id;
          setExpenses(prev => prev.filter(e => e.id !== deletedId));
          refreshBudgetStats();
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: spaceFilter },
        async () => {
          const [budgetData, stats] = await Promise.all([
            projectsService.getBudget(currentSpace.id),
            projectsService.getBudgetStats(currentSpace.id),
          ]);
          setCurrentBudget(budgetData?.monthly_budget || 0);
          setBudgetStats(stats);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSpace, refreshBudgetStats]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const filteredExpenses = useMemo(
    () => expenses.filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase())),
    [expenses, searchQuery]
  );

  const expenseStats = useMemo<ExpenseStats>(() => ({
    totalCount: expenses.length,
    pendingCount: expenses.filter(e => e.status === 'pending').length,
    paidCount: expenses.filter(e => e.status === 'paid').length,
    totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
  }), [expenses]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const setBudget = useCallback(async (amount: number) => {
    if (!currentSpace || !user) return;
    try {
      await projectsService.setBudget({ space_id: currentSpace.id, monthly_budget: amount }, user.id);
      loadData();
    } catch (error) {
      logger.error('Failed to set budget:', error, { component: 'use-budget-data', action: 'set_budget' });
    }
  }, [currentSpace, user, loadData]);

  const applyTemplate = useCallback(async (templateId: string, monthlyIncome: number) => {
    if (!currentSpace) return;
    try {
      await budgetTemplatesService.applyTemplate({
        space_id: currentSpace.id,
        template_id: templateId,
        monthly_income: monthlyIncome,
      });
      loadData();
    } catch (error) {
      logger.error('Failed to apply budget template:', error, { component: 'use-budget-data', action: 'apply_template' });
    }
  }, [currentSpace, loadData]);

  const saveExpense = useCallback(async (data: CreateExpenseInput, editingId?: string) => {
    if (!currentSpace) return;
    try {
      if (editingId) {
        await projectsService.updateExpense(editingId, data);
      } else {
        await projectsService.createExpense(data);
      }
      // Budget-threshold alerts fire after any expense change (same as the
      // former projects-page handler).
      await budgetAlertsService.checkBudgetAfterExpenseChange(currentSpace.id);
      loadData();
    } catch (error) {
      logger.error('Failed to save expense:', error, { component: 'use-budget-data', action: 'save_expense' });
    }
  }, [currentSpace, loadData]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    try {
      await projectsService.deleteExpense(expenseId);
      loadData();
    } catch (error) {
      logger.error('Failed to delete expense:', error, { component: 'use-budget-data', action: 'delete_expense' });
    }
  }, [loadData]);

  const changeExpenseStatus = useCallback(async (expenseId: string, newStatus: 'pending' | 'paid') => {
    try {
      await projectsService.updateExpense(expenseId, { status: newStatus });
      loadData();
    } catch (error) {
      logger.error('Failed to update expense status:', error, { component: 'use-budget-data', action: 'change_status' });
    }
  }, [loadData]);

  return {
    currentSpace,
    user,
    loading,
    currentBudget,
    budgetStats,
    budgetTemplates,
    templateCategories,
    expenses,
    filteredExpenses,
    expenseStats,
    searchQuery,
    setSearchQuery,
    loadData,
    setBudget,
    applyTemplate,
    saveExpense,
    deleteExpense,
    changeExpenseStatus,
  };
}
