'use client';

import { useState, useEffect } from 'react';
import { Home, Search, Plus, CheckCircle2, DollarSign, AlertCircle, Hammer, Wallet, Receipt } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ChoreCard } from '@/components/projects/ChoreCard';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { NewChoreModal } from '@/components/projects/NewChoreModal';
import { NewExpenseModal } from '@/components/projects/NewExpenseModal';
import { NewBudgetModal } from '@/components/projects/NewBudgetModal';
import { UpdateProgressModal } from '@/components/projects/UpdateProgressModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { projectsService, Chore, Expense, CreateChoreInput, CreateExpenseInput } from '@/lib/services/projects-service';

type TabType = 'projects' | 'budget' | 'expenses';

export default function HouseholdPage() {
  const { currentSpace, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [chores, setChores] = useState<Chore[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [updatingChore, setUpdatingChore] = useState<Chore | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [stats, setStats] = useState({
    chores: { total: 0, completedThisWeek: 0, myChores: 0, partnerChores: 0 },
    budget: { monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 },
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [choresData, expensesData, statsData, budgetData] = await Promise.all([
        projectsService.getChores(currentSpace.id),
        projectsService.getExpenses(currentSpace.id),
        projectsService.getHouseholdStats(currentSpace.id, user.id),
        projectsService.getBudget(currentSpace.id),
      ]);
      setChores(choresData);
      setExpenses(expensesData);
      setStats(statsData);
      setCurrentBudget(budgetData?.monthly_budget || 0);
    } catch (error) {
      console.error('Failed to load household data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChore(choreData: CreateChoreInput) {
    try {
      if (editingChore) {
        await projectsService.updateChore(editingChore.id, choreData);
      } else {
        await projectsService.createChore(choreData);
      }
      loadData();
      setEditingChore(null);
    } catch (error) {
      console.error('Failed to save chore:', error);
    }
  }

  async function handleCreateExpense(expenseData: CreateExpenseInput) {
    try {
      if (editingExpense) {
        await projectsService.updateExpense(editingExpense.id, expenseData);
      } else {
        await projectsService.createExpense(expenseData);
      }
      loadData();
      setEditingExpense(null);
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  }

  async function handleChoreStatusChange(choreId: string, status: string) {
    try {
      await projectsService.updateChore(choreId, { status: status as 'pending' | 'completed' | 'skipped' });
      loadData();
    } catch (error) {
      console.error('Failed to update chore:', error);
    }
  }

  async function handleDeleteChore(choreId: string) {
    if (!confirm('Are you sure?')) return;
    try {
      await projectsService.deleteChore(choreId);
      loadData();
    } catch (error) {
      console.error('Failed to delete chore:', error);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure?')) return;
    try {
      await projectsService.deleteExpense(expenseId);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  }

  async function handleSetBudget(amount: number) {
    try {
      await projectsService.setBudget(
        { space_id: currentSpace.id, monthly_budget: amount },
        user.id
      );
      loadData();
    } catch (error) {
      console.error('Failed to set budget:', error);
    }
  }

  async function handleUpdateProgress(choreId: string, completion: number, notes: string) {
    try {
      await projectsService.updateChore(choreId, {
        completion_percentage: completion,
        notes,
        // Auto-complete if 100%
        status: completion === 100 ? 'completed' : undefined,
      } as Partial<CreateChoreInput>);
      loadData();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  const filteredChores = chores.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects & Budget' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-projects flex items-center justify-center"><Home className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-projects bg-clip-text text-transparent">Projects & Budget</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Plan home projects and manage family finances</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl border border-amber-200 dark:border-amber-700 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    activeTab === 'projects'
                      ? 'bg-gradient-projects text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Hammer className="w-4 h-4" />
                  <span className="text-sm">Projects</span>
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    activeTab === 'budget'
                      ? 'bg-gradient-projects text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm">Budget</span>
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium min-w-[90px] sm:min-w-[110px] ${
                    activeTab === 'expenses'
                      ? 'bg-gradient-projects text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-sm">Expenses</span>
                </button>
              </div>
              <button
                onClick={() => {
                  if (activeTab === 'projects') setIsChoreModalOpen(true);
                  else if (activeTab === 'budget') setIsBudgetModalOpen(true);
                  else setIsExpenseModalOpen(true);
                }}
                className="px-4 py-2 sm:px-6 sm:py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{activeTab === 'projects' ? 'New Project' : activeTab === 'budget' ? 'Set Budget' : 'New Expense'}</span>
                <span className="sm:hidden">{activeTab === 'projects' ? 'Project' : activeTab === 'budget' ? 'Budget' : 'Expense'}</span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard - Changes based on active tab */}
          {activeTab === 'projects' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Projects</h3>
                  <div className="w-12 h-12 bg-gradient-projects rounded-xl flex items-center justify-center"><Hammer className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {chores.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed This Week</h3>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chores.completedThisWeek}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Overdue Projects</h3>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center"><AlertCircle className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {chores.filter(c => c.due_date && new Date(c.due_date) < new Date() && c.status !== 'completed').length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completion Rate</h3>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {chores.length > 0 ? Math.round((chores.filter(c => c.status === 'completed').length / chores.length) * 100) : 0}%
                </p>
              </div>
            </div>
          ) : activeTab === 'budget' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Monthly Budget</h3>
                  <div className="w-12 h-12 bg-gradient-projects rounded-xl flex items-center justify-center"><Wallet className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.monthlyBudget.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Spent This Month</h3>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.spentThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Remaining Budget</h3>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Budget Health</h3>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    stats.budget.monthlyBudget === 0 ? 'bg-gray-500' :
                    (stats.budget.spentThisMonth / stats.budget.monthlyBudget) <= (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
                      ? 'bg-green-500'
                      : 'bg-orange-500'
                  }`}>
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.budget.monthlyBudget === 0 ? 'Not Set' :
                   (stats.budget.spentThisMonth / stats.budget.monthlyBudget) <= (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
                     ? 'On Track'
                     : 'Over Pace'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Expenses</h3>
                  <div className="w-12 h-12 bg-gradient-projects rounded-xl flex items-center justify-center"><Receipt className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Paid This Month</h3>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Pending Payments</h3>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Overdue</h3>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center"><AlertCircle className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {expenses.filter(e => e.status === 'overdue').length}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'projects'
                    ? 'Search projects...'
                    : activeTab === 'budget'
                    ? 'Search budget items...'
                    : 'Search expenses...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Content Area - Changes based on active tab */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {activeTab === 'projects' ? `All Projects (${filteredChores.length})` : activeTab === 'budget' ? 'Budget Overview' : `All Expenses (${filteredExpenses.length})`}
            </h2>
            {loading ? (
              <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p></div>
            ) : activeTab === 'projects' ? (
              filteredChores.length === 0 ? (
                <div className="text-center py-12"><Hammer className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No projects found</p><button onClick={() => setIsChoreModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Add Project</button></div>
              ) : (
                <div className="space-y-4">{filteredChores.map((chore) => (<ChoreCard key={chore.id} chore={chore} onStatusChange={handleChoreStatusChange} onEdit={(c) => { setEditingChore(c); setIsChoreModalOpen(true); }} onDelete={handleDeleteChore} onUpdateProgress={(c) => { setUpdatingChore(c); setIsProgressModalOpen(true); }} />))}</div>
              )
            ) : activeTab === 'budget' ? (
              currentBudget === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No Budget Set</p>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">Set your monthly budget to start tracking expenses</p>
                  <button onClick={() => setIsBudgetModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Set Budget
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${stats.budget.monthlyBudget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">Monthly Budget</p>
                    </div>
                    <button
                      onClick={() => setIsBudgetModalOpen(true)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      Update Budget
                    </button>
                  </div>

                  {/* Budget Progress Bar with dynamic color gradient */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Spending Progress</p>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {Math.round((stats.budget.spentThisMonth / stats.budget.monthlyBudget) * 100)}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          (stats.budget.spentThisMonth / stats.budget.monthlyBudget) <= 0.7
                            ? 'bg-gradient-to-r from-green-400 to-green-500'
                            : (stats.budget.spentThisMonth / stats.budget.monthlyBudget) <= 0.9
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-orange-500 to-red-600'
                        }`}
                        style={{ width: `${Math.min((stats.budget.spentThisMonth / stats.budget.monthlyBudget) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Spent</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${stats.budget.spentThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Remaining</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${stats.budget.remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      View expenses in the <button onClick={() => setActiveTab('expenses')} className="text-purple-600 dark:text-purple-400 font-medium hover:underline">Expenses tab</button>
                    </p>
                  </div>
                </div>
              )
            ) : (
              filteredExpenses.length === 0 ? (
                <div className="text-center py-12"><Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No expenses found</p><button onClick={() => setIsExpenseModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Add Expense</button></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{filteredExpenses.map((expense) => (<ExpenseCard key={expense.id} expense={expense} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} onDelete={handleDeleteExpense} />))}</div>
              )
            )}
          </div>
        </div>
      </div>
      <NewChoreModal isOpen={isChoreModalOpen} onClose={() => { setIsChoreModalOpen(false); setEditingChore(null); }} onSave={handleCreateChore} editChore={editingChore} spaceId={currentSpace.id} />
      <NewExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} onSave={handleCreateExpense} editExpense={editingExpense} spaceId={currentSpace.id} />
      <NewBudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} onSave={handleSetBudget} currentBudget={currentBudget} spaceId={currentSpace.id} />
      <UpdateProgressModal isOpen={isProgressModalOpen} onClose={() => { setIsProgressModalOpen(false); setUpdatingChore(null); }} onSave={handleUpdateProgress} chore={updatingChore} />
    </FeatureLayout>
  );
}
