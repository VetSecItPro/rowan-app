'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { projectsOnlyService } from '@/lib/services/projects-service';
import { projectsService } from '@/lib/services/budgets-service';
import { billsService } from '@/lib/services/bills-service';
import { budgetTemplatesService, type BudgetTemplate, type BudgetTemplateCategory } from '@/lib/services/budget-templates-service';
import type { Project } from '@/lib/services/project-tracking-service';
import type { Expense } from '@/lib/services/budgets-service';
import type { Bill } from '@/lib/services/bills-service';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabType = 'projects' | 'budgets' | 'expenses' | 'bills' | 'receipts';

export type BudgetStats = {
  monthlyBudget: number;
  spentThisMonth: number;
  remaining: number;
  pendingBills: number;
};

export type ExpenseStats = {
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  totalAmount: number;
};

// Constant array - defined outside component to prevent recreation on every render (avoids flicker)
const VALID_TABS: TabType[] = ['projects', 'budgets', 'bills', 'expenses', 'receipts'];

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseProjectsDataReturn {
  // Auth / context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];

  // Tab state
  activeTab: TabType;
  handleTabChange: (tab: TabType) => void;

  // Core data
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  loading: boolean;

  // Budget data
  currentBudget: number;
  setCurrentBudget: React.Dispatch<React.SetStateAction<number>>;
  budgetStats: BudgetStats;
  setBudgetStats: React.Dispatch<React.SetStateAction<BudgetStats>>;
  budgetTemplates: BudgetTemplate[];
  templateCategories: Record<string, BudgetTemplateCategory[]>;

  // Search / filter state
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  projectFilter: 'all' | 'active' | 'completed';
  setProjectFilter: React.Dispatch<React.SetStateAction<'all' | 'active' | 'completed'>>;

  // Computed / memoized
  filteredProjects: Project[];
  filteredExpenses: Expense[];
  filteredBills: Bill[];
  expenseStats: ExpenseStats;

  // Actions
  loadData: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Loads and manages household projects data with filtering and search support */
export function useProjectsData(): UseProjectsDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── Tab state ────────────────────────────────────────────────────────────

  // Get tab from URL or default to first tab in array
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : VALID_TABS[0];
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Track if we're currently handling a user-initiated tab change to prevent sync conflicts
  const isUserTabChange = useRef(false);

  // Update URL when tab changes (without full page reload)
  const handleTabChange = useCallback((tab: TabType) => {
    isUserTabChange.current = true;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tab);
    router.replace(`/projects?${params.toString()}`, { scroll: false });
    // Reset after a short delay to allow URL to update
    setTimeout(() => {
      isUserTabChange.current = false;
    }, 100);
  }, [searchParams, router]);

  // Sync tab state when URL changes (e.g., back/forward navigation only)
  useEffect(() => {
    // Skip if this is a user-initiated change (we already set the state)
    if (isUserTabChange.current) return;

    const tabParam = searchParams?.get('tab') as TabType | null;
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  // ─── Core data state ──────────────────────────────────────────────────────

  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Budget data state ────────────────────────────────────────────────────

  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [budgetStats, setBudgetStats] = useState<BudgetStats>({ monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 });
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<Record<string, BudgetTemplateCategory[]>>({});

  // ─── Search / filter state ────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'completed'>('all');

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [projectsData, expensesData, billsData, budgetData, stats] = await Promise.all([
        projectsOnlyService.getProjects(currentSpace.id),
        projectsService.getExpenses(currentSpace.id),
        billsService.getBills(currentSpace.id),
        projectsService.getBudget(currentSpace.id),
        projectsService.getBudgetStats(currentSpace.id),
      ]);
      setProjects(projectsData);
      setExpenses(expensesData);
      setBills(billsData);
      setCurrentBudget(budgetData?.monthly_budget || 0);
      setBudgetStats(stats);
    } catch (error) {
      logger.error('Failed to load data:', error, { component: 'page', action: 'execution' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // ─── Initial data load ────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Load budget templates (once on mount) ────────────────────────────────

  useEffect(() => {
    async function loadTemplates() {
      try {
        const templates = await budgetTemplatesService.getBudgetTemplates();
        setBudgetTemplates(templates);

        // Load categories for each template
        const categoriesMap: Record<string, BudgetTemplateCategory[]> = {};
        await Promise.all(
          templates.map(async (template) => {
            const categories = await budgetTemplatesService.getTemplateCategories(template.id);
            categoriesMap[template.id] = categories;
          })
        );
        setTemplateCategories(categoriesMap);
      } catch (error) {
        logger.error('Failed to load budget templates:', error, { component: 'page', action: 'execution' });
      }
    }

    loadTemplates();
  }, []);

  // ─── Helper to refresh budget stats ───────────────────────────────────────

  const refreshBudgetStats = useCallback(async () => {
    if (!currentSpace) return;
    try {
      const stats = await projectsService.getBudgetStats(currentSpace.id);
      setBudgetStats(stats);
    } catch (error) {
      logger.error('Failed to refresh budget stats:', error, { component: 'page', action: 'refresh_stats' });
    }
  }, [currentSpace]);

  // ─── Real-time subscriptions with incremental updates ─────────────────────

  useEffect(() => {
    if (!currentSpace) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    // Subscribe to expenses changes - incremental updates
    const expensesChannel = supabase
      .channel(`projects_expenses:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newExpense = payload.new as Expense;
          setExpenses(prev => [newExpense, ...prev]);
          refreshBudgetStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expenses',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updatedExpense = payload.new as Expense;
          setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
          refreshBudgetStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'expenses',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedId = (payload.old as { id: string }).id;
          setExpenses(prev => prev.filter(e => e.id !== deletedId));
          refreshBudgetStats();
        }
      )
      .subscribe();
    channels.push(expensesChannel);

    // Subscribe to budgets changes - reload budget data only
    const budgetsChannel = supabase
      .channel(`projects_budgets:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        async () => {
          // Budget changes affect stats, reload both
          const [budgetData, stats] = await Promise.all([
            projectsService.getBudget(currentSpace.id),
            projectsService.getBudgetStats(currentSpace.id),
          ]);
          setCurrentBudget(budgetData?.monthly_budget || 0);
          setBudgetStats(stats);
        }
      )
      .subscribe();
    channels.push(budgetsChannel);

    // Subscribe to projects changes - incremental updates
    const projectsChannel = supabase
      .channel(`projects_projects:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newProject = payload.new as Project;
          setProjects(prev => [newProject, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updatedProject = payload.new as Project;
          setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'projects',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedId = (payload.old as { id: string }).id;
          setProjects(prev => prev.filter(p => p.id !== deletedId));
        }
      )
      .subscribe();
    channels.push(projectsChannel);

    // Subscribe to bills changes - incremental updates
    const billsChannel = supabase
      .channel(`projects_bills:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bills',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newBill = payload.new as Bill;
          setBills(prev => [newBill, ...prev]);
          refreshBudgetStats(); // Bills affect pending amount
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bills',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updatedBill = payload.new as Bill;
          setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
          refreshBudgetStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bills',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedId = (payload.old as { id: string }).id;
          setBills(prev => prev.filter(b => b.id !== deletedId));
          refreshBudgetStats();
        }
      )
      .subscribe();
    channels.push(billsChannel);

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentSpace, refreshBudgetStats]);

  // ─── Computed / memoized values ───────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (projectFilter === 'all') return true;
      if (projectFilter === 'active') return p.status !== 'completed';
      if (projectFilter === 'completed') return p.status === 'completed';
      return true;
    });
  }, [projects, searchQuery, projectFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [expenses, searchQuery]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [bills, searchQuery]);

  const expenseStats = useMemo<ExpenseStats>(() => {
    const totalCount = expenses.length;
    const pendingCount = expenses.filter(e => e.status === 'pending').length;
    const paidCount = expenses.filter(e => e.status === 'paid').length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { totalCount, pendingCount, paidCount, totalAmount };
  }, [expenses]);

  return {
    // Auth / context
    currentSpace,
    user,

    // Tab state
    activeTab,
    handleTabChange,

    // Core data
    projects,
    setProjects,
    expenses,
    setExpenses,
    bills,
    setBills,
    loading,

    // Budget data
    currentBudget,
    setCurrentBudget,
    budgetStats,
    setBudgetStats,
    budgetTemplates,
    templateCategories,

    // Search / filter state
    searchQuery,
    setSearchQuery,
    isSearchTyping,
    setIsSearchTyping,
    projectFilter,
    setProjectFilter,

    // Computed / memoized
    filteredProjects,
    filteredExpenses,
    filteredBills,
    expenseStats,

    // Actions
    loadData,
  };
}
