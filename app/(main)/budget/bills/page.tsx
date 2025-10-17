'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, AlertCircle, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BillsList } from '@/components/budget/BillsList';
import { NewBillModal } from '@/components/projects/NewBillModal';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  billsService,
  createBill,
  updateBill,
  deleteBill,
  markBillAsPaid,
  getBillStats,
  type Bill,
  type CreateBillInput,
  type BillStats,
} from '@/lib/services/bills-service';
import { useRouter } from 'next/navigation';

export default function BillsManagementPage() {
  const { currentSpace, user } = useAuth();
  const router = useRouter();

  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Load bills and stats
  const loadBillsData = useCallback(async () => {
    if (!currentSpace) return;

    try {
      setLoading(true);
      setError(null);

      const [billsData, statsData] = await Promise.all([
        billsService.getBills(currentSpace.id),
        getBillStats(currentSpace.id),
      ]);

      setBills(billsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load bills:', err);
      setError('Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentSpace]);

  useEffect(() => {
    loadBillsData();
  }, [loadBillsData]);

  // Handle bill creation
  const handleCreateBill = async (billData: CreateBillInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await createBill(billData, user.id);
      await loadBillsData(); // Refresh data
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create bill:', error);
      throw error;
    }
  };

  // Handle bill editing
  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowCreateModal(true);
  };

  // Handle bill update
  const handleUpdateBill = async (billData: CreateBillInput) => {
    if (!editingBill) return;

    try {
      await updateBill(editingBill.id, billData);
      await loadBillsData(); // Refresh data
      setShowCreateModal(false);
      setEditingBill(null);
    } catch (error) {
      console.error('Failed to update bill:', error);
      throw error;
    }
  };

  // Handle bill deletion
  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteBill(billId);
      await loadBillsData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete bill:', error);
      setError('Failed to delete bill. Please try again.');
    }
  };

  // Handle marking bill as paid
  const handleMarkPaid = async (billId: string) => {
    try {
      await markBillAsPaid(billId, true); // Create expense record
      await loadBillsData(); // Refresh data
    } catch (error) {
      console.error('Failed to mark bill as paid:', error);
      setError('Failed to mark bill as paid. Please try again.');
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingBill(null);
  };

  if (!currentSpace) {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Budget', href: '/projects?tab=budgets' },
          { label: 'Bills' },
        ]}
      >
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Please select a space to continue</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget', href: '/projects?tab=budgets' },
        { label: 'Bills' },
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Bills Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Manage your recurring bills, track due dates, and never miss a payment
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {stats && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bills</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.scheduled}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.overdue}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.totalAmountDue.toFixed(0)}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount Due</h3>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 shimmer-projects text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Bill
            </button>
          </div>

          {/* Bills List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading bills...</p>
            </div>
          ) : (
            <BillsList
              spaceId={currentSpace.id}
              onEdit={handleEditBill}
              onDelete={handleDeleteBill}
              onMarkPaid={handleMarkPaid}
              onCreateNew={() => setShowCreateModal(true)}
            />
          )}
        </div>
      </div>

      {/* Create/Edit Bill Modal */}
      <NewBillModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSave={editingBill ? handleUpdateBill : handleCreateBill}
        editBill={editingBill}
        spaceId={currentSpace.id}
      />
    </FeatureLayout>
  );
}