'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, Plus, Search, Wallet, Receipt, DollarSign, CheckCircle, Clock, FileText, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { NewExpenseModal } from '@/components/projects/NewExpenseModal';
import { NewBudgetModal } from '@/components/projects/NewBudgetModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SafeToSpendIndicator } from '@/components/projects/SafeToSpendIndicator';
import { BillCard } from '@/components/projects/BillCard';
import { NewBillModal } from '@/components/projects/NewBillModal';
import { BillsList } from '@/components/budget/BillsList';
import { BudgetTemplateModal } from '@/components/projects/BudgetTemplateModal';
import { SpendingInsightsCard } from '@/components/projects/SpendingInsightsCard';
import { ReceiptUploadModal } from '@/components/projects/ReceiptUploadModal';
import { ReceiptsListCard } from '@/components/projects/ReceiptsListCard';
import { useAuth } from '@/lib/contexts/auth-context';
import { projectsOnlyService, type CreateProjectInput } from '@/lib/services/projects-service';
import { projectsService, type Expense, type CreateExpenseInput } from '@/lib/services/budgets-service';
import { budgetAlertsService } from '@/lib/services/budget-alerts-service';
import { billsService, type Bill, type CreateBillInput } from '@/lib/services/bills-service';
import { budgetTemplatesService, type BudgetTemplate, type BudgetTemplateCategory } from '@/lib/services/budget-templates-service';
import type { Project } from '@/lib/types';

type TabType = 'projects' | 'budgets' | 'expenses' | 'bills' | 'receipts';

export default function ProjectsPage() {
  const { currentSpace, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('projects');
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
      console.error('Failed to load data:', error);
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
        console.error('Failed to load budget templates:', error);
      }
    }

    loadTemplates();
  }, []);

  const handleCreateProject = useCallback(async (data: CreateProjectInput) => {
    try {
      if (editingProject) {
        await projectsOnlyService.updateProject(editingProject.id, data);
      } else {
        await projectsOnlyService.createProject(data);
      }
      loadData();
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
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
      console.error('Failed to save expense:', error);
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
      console.error(`Failed to ${action}:`, error);
    }
  }, [confirmDialog, loadData]);

  const handleStatusChange = useCallback(async (expenseId: string, newStatus: 'pending' | 'paid') => {
    try {
      await projectsService.updateExpense(expenseId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Failed to update expense status:', error);
    }
  }, [loadData]);

  const handleSetBudget = useCallback(async (amount: number) => {
    if (!currentSpace || !user) return;
    try {
      await projectsService.setBudget({ space_id: currentSpace.id, monthly_budget: amount }, user.id);
      loadData();
    } catch (error) {
      console.error('Failed to set budget:', error);
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
      console.error('Failed to save bill:', error);
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
      console.error('Failed to mark bill as paid:', error);
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
      console.error('Failed to apply budget template:', error);
    }
  }, [currentSpace, loadData]);

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBills = bills.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent">
                  Projects & Budget
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage projects, budgets, and expenses</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-amber-100 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-700 w-full sm:w-auto overflow-x-auto">
                {(['projects', 'budgets', 'bills', 'expenses', 'receipts'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {tab === 'projects' && <Folder className="w-4 h-4" />}
                    {tab === 'budgets' && <Wallet className="w-4 h-4" />}
                    {tab === 'bills' && <FileCheck className="w-4 h-4" />}
                    {tab === 'expenses' && <Receipt className="w-4 h-4" />}
                    {tab === 'receipts' && <Receipt className="w-4 h-4" />}
                    <span className="text-sm capitalize">{tab}</span>
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
                  breathing
                  ripple
                  icon={<Plus className="w-5 h-5 flex-shrink-0" />}
                  className="min-w-[120px] sm:min-w-[180px] px-4 py-2 sm:px-6 sm:py-3"
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
                  breathing
                  ripple
                  icon={<Plus className="w-5 h-5 flex-shrink-0" />}
                  className="min-w-[120px] sm:min-w-[180px] px-4 py-2 sm:px-6 sm:py-3"
                >
                  <span className="hidden sm:inline whitespace-nowrap">Upload Receipt</span>
                  <span className="sm:hidden whitespace-nowrap">Upload</span>
                </CTAButton>
              )}
            </div>
          </div>

          {activeTab === 'expenses' && expenses.length > 0 && (
            <div className="stats-grid-mobile gap-4 sm:gap-6">
              {/* Total Expenses */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Expenses</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {expenseStats.totalCount}
                </p>
              </div>

              {/* Pending */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {expenseStats.pendingCount}
                </p>
              </div>

              {/* Paid */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {expenseStats.paidCount}
                </p>
              </div>

              {/* Total Amount */}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${expenseStats.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 input-mobile bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg focus:ring-2 focus:ring-amber-500/50 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {activeTab === 'projects' && `All Projects (${filteredProjects.length})`}
                  {activeTab === 'budgets' && 'Budget Overview'}
                  {activeTab === 'bills' && `All Bills (${filteredBills.length})`}
                  {activeTab === 'expenses' && `All Expenses (${filteredExpenses.length})`}
                </h2>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Category Filter for Projects - Segmented Buttons */}
              {activeTab === 'projects' && filteredProjects.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-amber-200 dark:border-amber-700 rounded-lg p-1 flex gap-1 w-fit">
                  <button
                    className="px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs min-h-[44px] md:min-h-0 rounded-md transition-all whitespace-nowrap min-w-[60px] bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                  >
                    All
                  </button>
                  <button
                    className="px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs min-h-[44px] md:min-h-0 rounded-md transition-all whitespace-nowrap min-w-[60px] text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    Active
                  </button>
                  <button
                    className="px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs min-h-[44px] md:min-h-0 rounded-md transition-all whitespace-nowrap min-w-[80px] text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6 mb-4" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2" />
                    <div className="flex items-center justify-between mt-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'projects' ? (
              filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No projects found</p>
                  <CTAButton
                    onClick={() => setIsProjectModalOpen(true)}
                    feature="projects"
                    breathing
                    ripple
                    icon={<Plus className="w-5 h-5" />}
                  >
                    Create Project
                  </CTAButton>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} onEdit={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }} onDelete={handleDeleteProject} />
                    ))}
                  </div>
                </div>
              )
            ) : activeTab === 'budgets' ? (
              currentBudget === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No Budget Set</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Get started quickly with a template or set a custom amount</p>
                  <div className="flex items-center gap-3 justify-center">
                    <CTAButton
                      onClick={() => setIsTemplateModalOpen(true)}
                      feature="projects"
                      breathing
                      ripple
                      icon={<FileText className="w-5 h-5" />}
                    >
                      Use Template
                    </CTAButton>
                    <button onClick={() => setIsBudgetModalOpen(true)} className="btn-touch bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all shadow-lg inline-flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Set Custom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Safe to Spend Indicator */}
                  <SafeToSpendIndicator spaceId={currentSpace.id} />

                  {/* Budget Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${budgetStats.monthlyBudget.toLocaleString()}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">Monthly Budget</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CTAButton
                        onClick={() => setIsTemplateModalOpen(true)}
                        feature="projects"
                        breathing
                        ripple
                        size="sm"
                        icon={<FileText className="w-4 h-4" />}
                      >
                        Use Template
                      </CTAButton>
                      <button onClick={() => setIsBudgetModalOpen(true)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                        Update Budget
                      </button>
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Spent this month</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {budgetStats.monthlyBudget > 0
                          ? `${Math.min(100, Math.round((budgetStats.spentThisMonth / budgetStats.monthlyBudget) * 100))}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          budgetStats.monthlyBudget > 0 && (budgetStats.spentThisMonth / budgetStats.monthlyBudget) >= 0.9
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : budgetStats.monthlyBudget > 0 && (budgetStats.spentThisMonth / budgetStats.monthlyBudget) >= 0.7
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{
                          width: budgetStats.monthlyBudget > 0
                            ? `${Math.min(100, (budgetStats.spentThisMonth / budgetStats.monthlyBudget) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Budget Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Monthly Budget */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Monthly Budget</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        ${budgetStats.monthlyBudget.toLocaleString()}
                      </p>
                    </div>

                    {/* Spent This Month */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Spent</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        ${budgetStats.spentThisMonth.toLocaleString()}
                      </p>
                    </div>

                    {/* Remaining */}
                    <div className={`bg-gradient-to-br ${budgetStats.remaining >= 0 ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700' : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700'} border rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className={`w-5 h-5 ${budgetStats.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                        <p className={`text-sm font-medium ${budgetStats.remaining >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                          {budgetStats.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                        </p>
                      </div>
                      <p className={`text-2xl font-bold ${budgetStats.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${Math.abs(budgetStats.remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Spending Insights */}
                  {currentSpace && (
                    <div className="mt-6">
                      <SpendingInsightsCard spaceId={currentSpace.id} />
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
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No expenses found</p>
                  <CTAButton
                    onClick={() => setIsExpenseModalOpen(true)}
                    feature="projects"
                    breathing
                    ripple
                    icon={<Plus className="w-5 h-5" />}
                  >
                    Add Expense
                  </CTAButton>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} onDelete={handleDeleteExpense} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )
            ) : activeTab === 'receipts' ? (
              currentSpace && <ReceiptsListCard spaceId={currentSpace.id} onDelete={() => loadData()} />
            ) : null}
          </div>
        </div>
      </div>
      {currentSpace && (
        <>
          <NewProjectModal isOpen={isProjectModalOpen} onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }} onSave={handleCreateProject} editProject={editingProject} spaceId={currentSpace.id} />
          <NewExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} onSave={handleCreateExpense} editExpense={editingExpense} spaceId={currentSpace.id} />
          <NewBudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} onSave={handleSetBudget} currentBudget={currentBudget} spaceId={currentSpace.id} />
          <NewBillModal isOpen={isBillModalOpen} onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }} onSave={handleCreateBill} editBill={editingBill} spaceId={currentSpace.id} />
          <BudgetTemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} onApply={handleApplyTemplate} templates={budgetTemplates} templateCategories={templateCategories} />
          <ReceiptUploadModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} spaceId={currentSpace.id} onSuccess={() => loadData()} />
        </>
      )}

      <ConfirmDialog
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
