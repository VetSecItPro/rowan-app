'use client';

import { useState, useEffect } from 'react';
import { Home, Search, Plus, CheckCircle2, Users, DollarSign, AlertCircle } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ChoreCard } from '@/components/projects/ChoreCard';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { NewChoreModal } from '@/components/projects/NewChoreModal';
import { NewExpenseModal } from '@/components/projects/NewExpenseModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { projectsService, Chore, Expense, CreateChoreInput, CreateExpenseInput } from '@/lib/services/projects-service';

type TabType = 'chores' | 'budget';

export default function HouseholdPage() {
  const { currentSpace, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('chores');
  const [chores, setChores] = useState<Chore[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    chores: { total: 0, completedThisWeek: 0, myChores: 0, partnerChores: 0 },
    budget: { monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 },
  });

  useEffect(() => {
    loadData();
  }, [currentSpace.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [choresData, expensesData, statsData] = await Promise.all([
        projectsService.getChores(currentSpace.id),
        projectsService.getExpenses(currentSpace.id),
        projectsService.getHouseholdStats(currentSpace.id, user.id),
      ]);
      setChores(choresData);
      setExpenses(expensesData);
      setStats(statsData);
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
      await projectsService.updateChore(choreId, { status: status as any });
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

  const filteredChores = chores.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenses = expenses.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects & Budget' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-projects flex items-center justify-center"><Home className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-projects bg-clip-text text-transparent">Projects & Budget</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Plan home projects and manage family finances</p>
              </div>
            </div>
            <button onClick={() => activeTab === 'chores' ? setIsChoreModalOpen(true) : setIsExpenseModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {activeTab === 'chores' ? 'New Project' : 'New Expense'}
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2">
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('chores')} className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'chores' ? 'bg-gradient-projects text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                Projects
              </button>
              <button onClick={() => setActiveTab('budget')} className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'budget' ? 'bg-gradient-projects text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                Budget & Expenses
              </button>
            </div>
          </div>

          {/* Stats Dashboard - Changes based on active tab */}
          {activeTab === 'chores' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Projects</h3>
                  <div className="w-12 h-12 bg-gradient-projects rounded-xl flex items-center justify-center"><Home className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chores.total}</p>
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
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">My Projects</h3>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chores.myChores}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Partner's Projects</h3>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.chores.partnerChores}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Monthly Budget</h3>
                  <div className="w-12 h-12 bg-gradient-projects rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.monthlyBudget}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Spent This Month</h3>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.spentThisMonth.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Remaining</h3>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.budget.remaining.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 dark:text-gray-400 font-medium">Pending Bills</h3>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center"><AlertCircle className="w-6 h-6 text-white" /></div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.budget.pendingBills}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>

          {/* Content Area - Changes based on active tab */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {activeTab === 'chores' ? `All Projects (${filteredChores.length})` : `All Expenses (${filteredExpenses.length})`}
            </h2>
            {loading ? (
              <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p></div>
            ) : activeTab === 'chores' ? (
              filteredChores.length === 0 ? (
                <div className="text-center py-12"><Home className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No projects found</p><button onClick={() => setIsChoreModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Add Project</button></div>
              ) : (
                <div className="space-y-4">{filteredChores.map((chore) => (<ChoreCard key={chore.id} chore={chore} onStatusChange={handleChoreStatusChange} onEdit={(c) => { setEditingChore(c); setIsChoreModalOpen(true); }} onDelete={handleDeleteChore} />))}</div>
              )
            ) : (
              filteredExpenses.length === 0 ? (
                <div className="text-center py-12"><DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No expenses found</p><button onClick={() => setIsExpenseModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Add Expense</button></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredExpenses.map((expense) => (<ExpenseCard key={expense.id} expense={expense} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} onDelete={handleDeleteExpense} />))}</div>
              )
            )}
          </div>
        </div>
      </div>
      <NewChoreModal isOpen={isChoreModalOpen} onClose={() => { setIsChoreModalOpen(false); setEditingChore(null); }} onSave={handleCreateChore} editChore={editingChore} spaceId={currentSpace.id} />
      <NewExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} onSave={handleCreateExpense} editExpense={editingExpense} spaceId={currentSpace.id} />
    </FeatureLayout>
  );
}
