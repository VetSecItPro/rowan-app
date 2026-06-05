'use client';

import { useState } from 'react';
import { Receipt, Plus, Search, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BudgetTabBar } from '@/components/budget/BudgetTabBar';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { LazyNewExpenseModal, LazyConfirmDialog } from '@/lib/utils/lazy-components';
import { useBudgetData } from '@/lib/hooks/useBudgetData';
import type { Expense, CreateExpenseInput } from '@/lib/services/budgets-service';

/**
 * Expenses sub-view of the /budget hub (PR14). Preserves the behavior of the
 * former /projects "expenses" tab exactly: searchable ExpenseCard grid with
 * add / edit / delete-with-confirm / paid-status toggle. Data + CRUD come from
 * the shared useBudgetData hook so the Overview and Expenses views stay in sync.
 */
export function BudgetExpensesClient() {
  const {
    currentSpace,
    loading,
    filteredExpenses,
    expenseStats,
    searchQuery,
    setSearchQuery,
    saveExpense,
    deleteExpense,
    changeExpenseStatus,
  } = useBudgetData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  const handleSave = async (data: CreateExpenseInput) => {
    await saveExpense(data, editingExpense?.id);
    closeModal();
  };

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget', href: '/budget' },
        { label: 'Expenses' },
      ]}
    >
      <BudgetTabBar />

      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Expenses
              </h1>
              <p className="text-gray-400 mt-1">Track what your household spends, by item</p>
            </div>
            {currentSpace && (
              <CTAButton onClick={openCreate} feature="projects" icon={<Plus className="w-5 h-5" />} className="!rounded-full">
                Add Expense
              </CTAButton>
            )}
          </div>

          {/* Stats */}
          {!loading && expenseStats.totalCount > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/20 border border-amber-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <p className="text-sm font-medium text-amber-100">Total Spent</p>
                </div>
                <p className="text-2xl font-bold text-amber-400">${expenseStats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <p className="text-sm font-medium text-orange-100">Pending</p>
                </div>
                <p className="text-2xl font-bold text-orange-400">{expenseStats.pendingCount}</p>
              </div>
              <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 border border-green-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-sm font-medium text-green-100">Paid</p>
                </div>
                <p className="text-2xl font-bold text-green-400">{expenseStats.paidCount}</p>
              </div>
            </div>
          )}

          {/* Search */}
          {!loading && expenseStats.totalCount > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading expenses...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && filteredExpenses.length === 0 && (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">
                {expenseStats.totalCount === 0 ? 'No expenses yet' : 'No expenses match your search'}
              </p>
              {expenseStats.totalCount === 0 && currentSpace && (
                <CTAButton onClick={openCreate} feature="projects" icon={<Plus className="w-5 h-5" />} className="!rounded-full mt-2">
                  Add Expense
                </CTAButton>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && filteredExpenses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onEdit={openEdit}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  onStatusChange={changeExpenseStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {currentSpace && (
        <LazyNewExpenseModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSave}
          editExpense={editingExpense}
          spaceId={currentSpace.id}
        />
      )}

      <LazyConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) deleteExpense(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </FeatureLayout>
  );
}
