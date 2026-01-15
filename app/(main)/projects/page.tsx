'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Folder, Plus, Search, Wallet, Receipt, DollarSign, CheckCircle, Clock, FileText, FileCheck, X } from 'lucide-react';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { SafeToSpendIndicator } from '@/components/projects/SafeToSpendIndicator';
import { BillsList } from '@/components/budget/BillsList';
import { logger } from '@/lib/logger';
// Lazy-loaded modals for better initial page load
import {
  LazyNewProjectModal,
  LazyNewExpenseModal,
  LazyNewBudgetModal,
  LazyNewBillModal,
  LazyBudgetTemplateModal,
  LazyReceiptUploadModal,
  LazySpendingInsightsCard,
  LazyReceiptsListCard,
  LazyConfirmDialog,
} from '@/lib/utils/lazy-components';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { projectsOnlyService, type CreateProjectInput } from '@/lib/services/projects-service';
import { projectsService, type Expense, type CreateExpenseInput } from '@/lib/services/budgets-service';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';
import { billsService, type Bill, type CreateBillInput } from '@/lib/services/bills-service';
import { budgetTemplatesService, type BudgetTemplate, type BudgetTemplateCategory } from '@/lib/services/budget-templates-service';
import type { Project } from '@/lib/services/project-tracking-service';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TabType = 'projects' | 'budgets' | 'expenses' | 'bills' | 'receipts';

// Constant array - defined outside component to prevent recreation on every render (avoids flicker)
const VALID_TABS: TabType[] = ['projects', 'budgets', 'bills', 'expenses', 'receipts'];

export default function ProjectsPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [budgetStats, setBudgetStats] = useState({ monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 });
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<Record<string, BudgetTemplateCategory[]>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; action: 'delete-project' | 'delete-expense' | 'delete-bill'; id: string }>({ isOpen: false, action: 'delete-project', id: '' });

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load budget templates (once on mount)
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

  // Helper to refresh budget stats (needed after expense changes)
  const refreshBudgetStats = useCallback(async () => {
    if (!currentSpace) return;
    try {
      const stats = await projectsService.getBudgetStats(currentSpace.id);
      setBudgetStats(stats);
    } catch (error) {
      logger.error('Failed to refresh budget stats:', error, { component: 'page', action: 'refresh_stats' });
    }
  }, [currentSpace]);

  // Real-time subscriptions with incremental updates (replaces full reload)
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
  }, [editingProject, loadData]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-project', id: projectId });
  }, []);

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
  }, [editingExpense, loadData, currentSpace]);

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-expense', id: expenseId });
  }, []);

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
  }, [confirmDialog, loadData]);

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
  }, [editingBill, loadData, user]);

  const handleDeleteBill = useCallback(async (billId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-bill', id: billId });
  }, []);

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

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (projectFilter === 'all') return true;
    if (projectFilter === 'active') return p.status !== 'completed';
    if (projectFilter === 'completed') return p.status === 'completed';
    return true;
  });
  const filteredExpenses = expenses.filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBills = bills.filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const expenseStats = useMemo(() => {
    const totalCount = expenses.length;
    const pendingCount = expenses.filter(e => e.status === 'pending').length;
    const paidCount = expenses.filter(e => e.status === 'paid').length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { totalCount, pendingCount, paidCount, totalAmount };
  }, [expenses]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects & Budget' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent">
                  Projects & Budget
                </h1>
                <p className="text-gray-400 mt-1">Manage projects, budgets, and expenses</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="grid grid-cols-5 sm:flex sm:items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-amber-100 from-amber-900/30 to-amber-900/30 rounded-xl border border-amber-700 w-full sm:w-auto">
                {(['projects', 'budgets', 'bills', 'expenses', 'receipts'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`sm:flex-none px-1 sm:px-4 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 transition-all font-medium ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {tab === 'projects' && <Folder className="w-4 h-4 flex-shrink-0" />}
                    {tab === 'budgets' && <Wallet className="w-4 h-4 flex-shrink-0" />}
                    {tab === 'bills' && <FileCheck className="w-4 h-4 flex-shrink-0" />}
                    {tab === 'expenses' && <Receipt className="w-4 h-4 flex-shrink-0" />}
                    {tab === 'receipts' && <Receipt className="w-4 h-4 flex-shrink-0" />}
                    <span className="text-[10px] sm:text-sm capitalize leading-tight">{tab}</span>
                  </button>
                ))}
              </div>
              {activeTab !== 'receipts' && (
                <CTAButton
                  onClick={() => {
                    if (activeTab === 'projects') setIsProjectModalOpen(true);
                    else if (activeTab === 'budgets') setIsBudgetModalOpen(true);
                    else if (activeTab === 'bills') setIsBillModalOpen(true);
                    else setIsExpenseModalOpen(true);
                  }}
                  feature="projects"
                  icon={<Plus className="w-5 h-5 flex-shrink-0" />}
                  className="min-w-[120px] sm:min-w-[180px] px-4 py-2 sm:px-6 sm:py-3 !rounded-full"
                >
                  <span className="hidden sm:inline whitespace-nowrap">
                    {activeTab === 'projects' ? 'New Project' : activeTab === 'budgets' ? 'Set Budget' : activeTab === 'bills' ? 'New Bill' : 'New Expense'}
                  </span>
                  <span className="sm:hidden whitespace-nowrap">{activeTab === 'projects' ? 'Project' : activeTab === 'budgets' ? 'Budget' : activeTab === 'bills' ? 'Bill' : 'Expense'}</span>
                </CTAButton>
              )}
              {activeTab === 'receipts' && (
                <CTAButton
                  onClick={() => setIsReceiptModalOpen(true)}
                  feature="projects"
                  icon={<Plus className="w-5 h-5 flex-shrink-0" />}
                  className="min-w-[120px] sm:min-w-[180px] px-4 py-2 sm:px-6 sm:py-3 !rounded-full"
                >
                  <span className="hidden sm:inline whitespace-nowrap">Upload Receipt</span>
                  <span className="sm:hidden whitespace-nowrap">Upload</span>
                </CTAButton>
              )}
            </div>
          </div>

          {activeTab === 'expenses' && expenses.length > 0 && (
            <CollapsibleStatsGrid
              icon={Receipt}
              title="Expense Stats"
              summary={`${expenseStats.pendingCount} pending • $${expenseStats.totalAmount.toLocaleString()}`}
              iconGradient="bg-amber-500"
            >
              {/* Total Expenses */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-300">Total Expenses</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {expenseStats.totalCount}
                </p>
              </div>

              {/* Pending */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-300">Pending</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {expenseStats.pendingCount}
                </p>
              </div>

              {/* Paid */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-300">Paid</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {expenseStats.paidCount}
                </p>
              </div>

              {/* Total Amount */}
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-300">Total Amount</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  ${expenseStats.totalAmount.toLocaleString()}
                </p>
              </div>
            </CollapsibleStatsGrid>
          )}

          {/* Search box - hidden for bills/receipts tabs which have their own search */}
          {activeTab !== 'bills' && activeTab !== 'receipts' ? (
            <div>
              <div className="apple-search-container projects-search">
                <Search className="apple-search-icon" />
                <input
                  type="search"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);

                    // Handle typing animation
                    if (value.length > 0) {
                      setIsSearchTyping(true);
                      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
                      return () => clearTimeout(timeoutId);
                    } else {
                      setIsSearchTyping(false);
                    }
                  }}
                  className={`apple-search-input w-full ${isSearchTyping ? 'typing' : ''}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchTyping(false);
                    }}
                    className={`apple-search-clear ${searchQuery ? 'visible' : ''}`}
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : null}

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 overflow-visible min-h-content-panel">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  {activeTab === 'projects' && `All Projects (${filteredProjects.length})`}
                  {activeTab === 'budgets' && 'Budget Overview'}
                  {activeTab === 'bills' && `All Bills (${filteredBills.length})`}
                  {activeTab === 'expenses' && `All Expenses (${filteredExpenses.length})`}
                </h2>
                <span className="px-3 py-1 bg-amber-900/30 border border-amber-700 text-amber-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Category Filter for Projects - Segmented Buttons */}
              {activeTab === 'projects' && projects.length > 0 && (
                <div className="bg-gray-900 border-2 border-amber-700 rounded-lg p-1 grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex">
                  <button
                    onClick={() => setProjectFilter('all')}
                    className={`px-3 py-2.5 text-sm font-medium sm:px-4 min-h-[44px] sm:min-h-0 rounded-md transition-all whitespace-nowrap ${
                      projectFilter === 'all'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                        : 'text-gray-400 hover:bg-amber-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setProjectFilter('active')}
                    className={`px-3 py-2.5 text-sm font-medium sm:px-4 min-h-[44px] sm:min-h-0 rounded-md transition-all whitespace-nowrap ${
                      projectFilter === 'active'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                        : 'text-gray-400 hover:bg-amber-900/20'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setProjectFilter('completed')}
                    className={`px-3 py-2.5 text-sm font-medium sm:px-4 min-h-[44px] sm:min-h-0 rounded-md transition-all whitespace-nowrap ${
                      projectFilter === 'completed'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                        : 'text-gray-400 hover:bg-amber-900/20'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                    <div className="h-6 bg-gray-600 rounded w-3/4 mb-4" />
                    <div className="h-4 bg-gray-600 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-600 rounded w-5/6 mb-4" />
                    <div className="h-2 bg-gray-600 rounded w-full mb-2" />
                    <div className="flex items-center justify-between mt-4">
                      <div className="h-4 bg-gray-600 rounded w-20" />
                      <div className="h-4 bg-gray-600 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'projects' ? (
              filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No projects found</p>
                  <CTAButton
                    onClick={() => setIsProjectModalOpen(true)}
                    feature="projects"
                    icon={<Plus className="w-5 h-5" />}
                    className="!rounded-full"
                  >
                    Create Project
                  </CTAButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} onEdit={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }} onDelete={handleDeleteProject} />
                  ))}
                </div>
              )
            ) : activeTab === 'budgets' ? (
              currentBudget === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No Budget Set</p>
                  <p className="text-gray-400 text-sm mb-4">Get started quickly with a template or set a custom amount</p>
                  <div className="flex items-center gap-3 justify-center">
                    <CTAButton
                      onClick={() => setIsTemplateModalOpen(true)}
                      feature="projects"
                      icon={<FileText className="w-4 h-4" />}
                      className="!rounded-full px-5 py-2.5 text-sm"
                    >
                      Use Template
                    </CTAButton>
                    <button onClick={() => setIsBudgetModalOpen(true)} className="btn-touch bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all shadow-lg inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
                      <Plus className="w-4 h-4" />
                      Set Custom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Safe to Spend Indicator */}
                  {currentSpace && <SafeToSpendIndicator spaceId={currentSpace.id} />}

                  {/* Budget Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        ${budgetStats.monthlyBudget.toLocaleString()}
                      </h3>
                      <p className="text-gray-400">Monthly Budget</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CTAButton
                        onClick={() => setIsTemplateModalOpen(true)}
                        feature="projects"
                        size="sm"
                        icon={<FileText className="w-4 h-4" />}
                      >
                        Use Template
                      </CTAButton>
                      <button onClick={() => setIsBudgetModalOpen(true)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all">
                        Update Budget
                      </button>
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="space-y-2">
                    {(() => {
                      const percentUsed = budgetStats.monthlyBudget > 0
                        ? (budgetStats.spentThisMonth / budgetStats.monthlyBudget) * 100
                        : 0;
                      const isOver = percentUsed > 100;
                      const overagePercent = isOver ? percentUsed - 100 : 0;
                      // When over, calculate the relative widths: budget portion + overage portion = 100% of bar
                      const budgetPortionWidth = isOver ? (100 / percentUsed) * 100 : percentUsed;
                      const overagePortionWidth = isOver ? (overagePercent / percentUsed) * 100 : 0;

                      return (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Spent this month</span>
                            <span className={`font-medium ${isOver ? 'text-red-400' : 'text-white'}`}>
                              {percentUsed.toFixed(1)}%
                              {isOver && ` (+${overagePercent.toFixed(1)}% over)`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden relative flex">
                            {/* Budget portion (up to 100%) */}
                            <div
                              className={`h-full transition-all duration-300 ${
                                isOver
                                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 rounded-l-full'
                                  : percentUsed >= 90
                                  ? 'bg-gradient-to-r from-red-500 to-red-600 rounded-full'
                                  : percentUsed >= 70
                                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full'
                                  : 'bg-gradient-to-r from-green-500 to-green-600 rounded-full'
                              }`}
                              style={{ width: `${budgetPortionWidth}%` }}
                            />
                            {/* Overage portion (above 100%) - different color */}
                            {isOver && (
                              <div
                                className="h-full rounded-r-full animate-pulse relative overflow-hidden"
                                style={{ width: `${overagePortionWidth}%` }}
                              >
                                {/* Red background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600" />
                                {/* Striped overlay */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)',
                                  }}
                                />
                              </div>
                            )}
                            {/* 100% marker line when over budget */}
                            {isOver && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-900 z-10"
                                style={{ left: `${budgetPortionWidth}%` }}
                              />
                            )}
                          </div>
                          {/* Legend when over budget */}
                          {isOver && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
                                  <span className="text-gray-400">Budget (100%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)' }} />
                                  <span className="text-red-400">Over (+{overagePercent.toFixed(1)}%)</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Budget Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Monthly Budget */}
                    <div className="bg-gradient-to-br from-amber-50 from-amber-900/20 to-amber-800/20 border border-amber-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-amber-400" />
                        <p className="text-sm font-medium text-amber-100">Monthly Budget</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-400">
                        ${budgetStats.monthlyBudget.toLocaleString()}
                      </p>
                    </div>

                    {/* Spent This Month */}
                    <div className="bg-gradient-to-br from-orange-50 from-orange-900/20 to-orange-800/20 border border-orange-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-5 h-5 text-orange-400" />
                        <p className="text-sm font-medium text-orange-100">Spent</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">
                        ${budgetStats.spentThisMonth.toLocaleString()}
                      </p>
                    </div>

                    {/* Remaining */}
                    <div className={`bg-gradient-to-br ${budgetStats.remaining >= 0 ? 'from-green-50 from-green-900/20 to-green-800/20 border-green-700' : 'from-red-50 from-red-900/20 to-red-800/20 border-red-700'} border rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className={`w-5 h-5 ${budgetStats.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <p className={`text-sm font-medium ${budgetStats.remaining >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                          {budgetStats.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                        </p>
                      </div>
                      <p className={`text-2xl font-bold ${budgetStats.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.abs(budgetStats.remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Spending Insights */}
                  {currentSpace && (
                    <div className="mt-6">
                      <LazySpendingInsightsCard spaceId={currentSpace.id} />
                    </div>
                  )}
                </div>
              )
            ) : activeTab === 'bills' ? (
              currentSpace && (
                <BillsList
                  spaceId={currentSpace.id}
                  onEdit={(b) => { setEditingBill(b); setIsBillModalOpen(true); }}
                  onDelete={handleDeleteBill}
                  onMarkPaid={handleMarkBillPaid}
                  onCreateNew={() => setIsBillModalOpen(true)}
                />
              )
            ) : activeTab === 'expenses' ? (
              filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No expenses found</p>
                  <CTAButton
                    onClick={() => setIsExpenseModalOpen(true)}
                    feature="projects"
                    icon={<Plus className="w-5 h-5" />}
                    className="!rounded-full"
                  >
                    Add Expense
                  </CTAButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredExpenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} onDelete={handleDeleteExpense} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )
            ) : activeTab === 'receipts' ? (
              currentSpace && <LazyReceiptsListCard spaceId={currentSpace.id} onDelete={() => loadData()} />
            ) : null}
          </div>
        </div>
      </div>
      {currentSpace && (
        <>
          <LazyNewProjectModal isOpen={isProjectModalOpen} onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }} onSave={handleCreateProject} editProject={editingProject} spaceId={currentSpace.id} />
          <LazyNewExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} onSave={handleCreateExpense} editExpense={editingExpense} spaceId={currentSpace.id} />
          <LazyNewBudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} onSave={handleSetBudget} currentBudget={currentBudget} spaceId={currentSpace.id} />
          <LazyNewBillModal isOpen={isBillModalOpen} onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }} onSave={handleCreateBill} editBill={editingBill} spaceId={currentSpace.id} />
          <LazyBudgetTemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} onApply={handleApplyTemplate} templates={budgetTemplates} templateCategories={templateCategories} />
          <LazyReceiptUploadModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} spaceId={currentSpace.id} onSuccess={() => loadData()} />
        </>
      )}

      <LazyConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: 'delete-project', id: '' })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.action === 'delete-project' ? 'Delete Project' : confirmDialog.action === 'delete-bill' ? 'Delete Bill' : 'Delete Expense'}
        message={confirmDialog.action === 'delete-project'
          ? 'Are you sure you want to delete this project? This action cannot be undone.'
          : confirmDialog.action === 'delete-bill'
          ? 'Are you sure you want to delete this bill? This action cannot be undone.'
          : 'Are you sure you want to delete this expense? This action cannot be undone.'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
  );
}
