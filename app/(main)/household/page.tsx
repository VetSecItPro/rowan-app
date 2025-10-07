'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Home, Search, Plus, CheckCircle2, DollarSign, AlertCircle, Hammer, Wallet, Receipt } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ChoreCard } from '@/components/projects/ChoreCard';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { NewChoreModal } from '@/components/projects/NewChoreModal';
import { NewExpenseModal } from '@/components/projects/NewExpenseModal';
import { NewBudgetModal } from '@/components/projects/NewBudgetModal';
import { UpdateProgressModal } from '@/components/projects/UpdateProgressModal';
import { useAuth } from '@/lib/contexts/auth-context';
import { projectsService, Chore, Expense, CreateChoreInput, CreateExpenseInput } from '@/lib/services/projects-service';

type TabType = 'projects' | 'budget' | 'expenses';

// Memoized Stats Card Component
const StatsCard = memo(({
  title,
  value,
  icon: Icon,
  iconBgClass
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgClass: string;
}) => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-gray-600 dark:text-gray-400 font-medium">{title}</h3>
      <div className={`w-12 h-12 ${iconBgClass} rounded-xl flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
));
StatsCard.displayName = 'StatsCard';

// Memoized Budget Progress Bar Component
const BudgetProgressBar = memo(({
  spentAmount,
  totalBudget
}: {
  spentAmount: number;
  totalBudget: number;
}) => {
  const percentage = useMemo(() =>
    Math.round((spentAmount / totalBudget) * 100),
    [spentAmount, totalBudget]
  );

  const progressColor = useMemo(() => {
    const ratio = spentAmount / totalBudget;
    if (ratio <= 0.7) return 'bg-gradient-to-r from-green-400 to-green-500';
    if (ratio <= 0.9) return 'bg-gradient-to-r from-amber-400 to-orange-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
  }, [spentAmount, totalBudget]);

  const remaining = useMemo(() =>
    totalBudget - spentAmount,
    [totalBudget, spentAmount]
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Spending Progress</p>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${progressColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Spent</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            ${spentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Remaining</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            ${remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
        </div>
      </div>
    </div>
  );
});
BudgetProgressBar.displayName = 'BudgetProgressBar';

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

  const loadData = useCallback(async () => {
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
  }, [currentSpace.id, user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateChore = useCallback(async (choreData: CreateChoreInput) => {
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
  }, [editingChore, loadData]);

  const handleCreateExpense = useCallback(async (expenseData: CreateExpenseInput) => {
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
  }, [editingExpense, loadData]);

  const handleChoreStatusChange = useCallback(async (choreId: string, status: string) => {
    try {
      await projectsService.updateChore(choreId, { status: status as 'pending' | 'completed' | 'skipped' });
      loadData();
    } catch (error) {
      console.error('Failed to update chore:', error);
    }
  }, [loadData]);

  const handleDeleteChore = useCallback(async (choreId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await projectsService.deleteChore(choreId);
      loadData();
    } catch (error) {
      console.error('Failed to delete chore:', error);
    }
  }, [loadData]);

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await projectsService.deleteExpense(expenseId);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  }, [loadData]);

  const handleSetBudget = useCallback(async (amount: number) => {
    try {
      await projectsService.setBudget(
        { space_id: currentSpace.id, monthly_budget: amount },
        user.id
      );
      loadData();
    } catch (error) {
      console.error('Failed to set budget:', error);
    }
  }, [currentSpace.id, user.id, loadData]);

  const handleUpdateProgress = useCallback(async (choreId: string, completion: number, notes: string) => {
    try {
      await projectsService.updateChore(choreId, {
        completion_percentage: completion,
        notes,
        status: completion === 100 ? 'completed' : undefined,
      } as Partial<CreateChoreInput>);
      loadData();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [loadData]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleNewButtonClick = useCallback(() => {
    if (activeTab === 'projects') setIsChoreModalOpen(true);
    else if (activeTab === 'budget') setIsBudgetModalOpen(true);
    else setIsExpenseModalOpen(true);
  }, [activeTab]);

  const handleEditChore = useCallback((chore: Chore) => {
    setEditingChore(chore);
    setIsChoreModalOpen(true);
  }, []);

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  }, []);

  const handleUpdateProgressClick = useCallback((chore: Chore) => {
    setUpdatingChore(chore);
    setIsProgressModalOpen(true);
  }, []);

  const handleCloseChoreModal = useCallback(() => {
    setIsChoreModalOpen(false);
    setEditingChore(null);
  }, []);

  const handleCloseExpenseModal = useCallback(() => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  }, []);

  const handleCloseBudgetModal = useCallback(() => {
    setIsBudgetModalOpen(false);
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setIsProgressModalOpen(false);
    setUpdatingChore(null);
  }, []);

  const handleSwitchToExpenses = useCallback(() => {
    setActiveTab('expenses');
  }, []);

  // Memoized filtered data
  const filteredChores = useMemo(() =>
    chores.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [chores, searchQuery]
  );

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [expenses, searchQuery]
  );

  // Memoized project stats calculations
  const projectStats = useMemo(() => {
    const activeProjects = chores.filter(c => c.status === 'pending').length;
    const overdueProjects = chores.filter(c =>
      c.due_date && new Date(c.due_date) < new Date() && c.status !== 'completed'
    ).length;
    const completionRate = chores.length > 0
      ? Math.round((chores.filter(c => c.status === 'completed').length / chores.length) * 100)
      : 0;

    return { activeProjects, overdueProjects, completionRate };
  }, [chores]);

  // Memoized expense stats calculations
  const expenseStats = useMemo(() => {
    const paidAmount = expenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pendingAmount = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const overdueCount = expenses.filter(e => e.status === 'overdue').length;

    return { paidAmount, pendingAmount, overdueCount };
  }, [expenses]);

  // Memoized budget health calculation
  const budgetHealth = useMemo(() => {
    if (stats.budget.monthlyBudget === 0) {
      return { status: 'Not Set', color: 'bg-gray-500' };
    }

    const currentDay = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedSpendRatio = currentDay / daysInMonth;
    const actualSpendRatio = stats.budget.spentThisMonth / stats.budget.monthlyBudget;

    if (actualSpendRatio <= expectedSpendRatio) {
      return { status: 'On Track', color: 'bg-green-500' };
    }
    return { status: 'Over Pace', color: 'bg-orange-500' };
  }, [stats.budget.monthlyBudget, stats.budget.spentThisMonth]);

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
                  onClick={() => handleTabChange('projects')}
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
                  onClick={() => handleTabChange('budget')}
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
                  onClick={() => handleTabChange('expenses')}
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
                onClick={handleNewButtonClick}
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
              <StatsCard
                title="Active Projects"
                value={projectStats.activeProjects}
                icon={Hammer}
                iconBgClass="bg-gradient-projects"
              />
              <StatsCard
                title="Completed This Week"
                value={stats.chores.completedThisWeek}
                icon={CheckCircle2}
                iconBgClass="bg-green-500"
              />
              <StatsCard
                title="Overdue Projects"
                value={projectStats.overdueProjects}
                icon={AlertCircle}
                iconBgClass="bg-red-500"
              />
              <StatsCard
                title="Completion Rate"
                value={`${projectStats.completionRate}%`}
                icon={CheckCircle2}
                iconBgClass="bg-blue-500"
              />
            </div>
          ) : activeTab === 'budget' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <StatsCard
                title="Monthly Budget"
                value={`$${stats.budget.monthlyBudget.toLocaleString()}`}
                icon={Wallet}
                iconBgClass="bg-gradient-projects"
              />
              <StatsCard
                title="Spent This Month"
                value={`$${stats.budget.spentThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                icon={DollarSign}
                iconBgClass="bg-red-500"
              />
              <StatsCard
                title="Remaining Budget"
                value={`$${stats.budget.remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                icon={DollarSign}
                iconBgClass="bg-green-500"
              />
              <StatsCard
                title="Budget Health"
                value={budgetHealth.status}
                icon={AlertCircle}
                iconBgClass={budgetHealth.color}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <StatsCard
                title="Total Expenses"
                value={expenses.length}
                icon={Receipt}
                iconBgClass="bg-gradient-projects"
              />
              <StatsCard
                title="Paid This Month"
                value={`$${expenseStats.paidAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                icon={CheckCircle2}
                iconBgClass="bg-green-500"
              />
              <StatsCard
                title="Pending Payments"
                value={`$${expenseStats.pendingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                icon={DollarSign}
                iconBgClass="bg-orange-500"
              />
              <StatsCard
                title="Overdue"
                value={expenseStats.overdueCount}
                icon={AlertCircle}
                iconBgClass="bg-red-500"
              />
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
                onChange={handleSearchChange}
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
                <div className="space-y-4">{filteredChores.map((chore) => (<ChoreCard key={chore.id} chore={chore} onStatusChange={handleChoreStatusChange} onEdit={handleEditChore} onDelete={handleDeleteChore} onUpdateProgress={handleUpdateProgressClick} />))}</div>
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

                  <BudgetProgressBar
                    spentAmount={stats.budget.spentThisMonth}
                    totalBudget={stats.budget.monthlyBudget}
                  />

                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      View expenses in the <button onClick={handleSwitchToExpenses} className="text-purple-600 dark:text-purple-400 font-medium hover:underline">Expenses tab</button>
                    </p>
                  </div>
                </div>
              )
            ) : (
              filteredExpenses.length === 0 ? (
                <div className="text-center py-12"><Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No expenses found</p><button onClick={() => setIsExpenseModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Add Expense</button></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{filteredExpenses.map((expense) => (<ExpenseCard key={expense.id} expense={expense} onEdit={handleEditExpense} onDelete={handleDeleteExpense} />))}</div>
              )
            )}
          </div>
        </div>
      </div>
      <NewChoreModal isOpen={isChoreModalOpen} onClose={handleCloseChoreModal} onSave={handleCreateChore} editChore={editingChore} spaceId={currentSpace.id} />
      <NewExpenseModal isOpen={isExpenseModalOpen} onClose={handleCloseExpenseModal} onSave={handleCreateExpense} editExpense={editingExpense} spaceId={currentSpace.id} />
      <NewBudgetModal isOpen={isBudgetModalOpen} onClose={handleCloseBudgetModal} onSave={handleSetBudget} currentBudget={currentBudget} spaceId={currentSpace.id} />
      <UpdateProgressModal isOpen={isProgressModalOpen} onClose={handleCloseProgressModal} onSave={handleUpdateProgress} chore={updatingChore} />
    </FeatureLayout>
  );
}
