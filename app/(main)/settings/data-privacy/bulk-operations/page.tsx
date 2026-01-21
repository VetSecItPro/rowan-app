'use client';

import { useState } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Database,
  Trash2,
  Archive,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

export default function BulkOperationsPage() {
  const { user, currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleteCount, setDeleteCount] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const [archiveDate, setArchiveDate] = useState('');
  const [archiveCount, setArchiveCount] = useState<number | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  if (!user || !spaceId) {
    return <SpacesLoadingState />;
  }

  const handleGetDeleteCount = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      const response = await fetch(
        `/api/bulk/delete-expenses?space_id=${spaceId}&start_date=${deleteStartDate}&end_date=${deleteEndDate}`
      );
      const data = await response.json();
      setDeleteCount(data.count || 0);
    } catch (error) {
      logger.error('Error getting delete count:', error, { component: 'page', action: 'execution' });
      alert('Failed to get count');
    }
  };

  const handleBulkDelete = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${deleteCount} expenses? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteSuccess(false);

    try {
      const response = await csrfFetch('/api/bulk/delete-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: spaceId,
          options: {
            startDate: deleteStartDate,
            endDate: deleteEndDate,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeleteSuccess(true);
        setDeleteCount(null);
        setDeleteStartDate('');
        setDeleteEndDate('');
      } else {
        alert('Failed to delete expenses: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('Error deleting expenses:', error, { component: 'page', action: 'execution' });
      alert('Failed to delete expenses');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkArchive = async () => {
    if (!archiveDate) {
      alert('Please select a date');
      return;
    }

    const confirmMsg = archiveCount
      ? `Archive approximately ${archiveCount} completed tasks older than ${new Date(archiveDate).toLocaleDateString()}?`
      : `Archive all completed tasks older than ${new Date(archiveDate).toLocaleDateString()}?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsArchiving(true);
    setArchiveSuccess(false);

    try {
      const response = await csrfFetch('/api/bulk/archive-old-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: spaceId,
          data_type: 'tasks',
          older_than_date: archiveDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setArchiveSuccess(true);
        setArchiveCount(data.archived_count);
      } else {
        alert('Failed to archive tasks: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('Error archiving tasks:', error, { component: 'page', action: 'execution' });
      alert('Failed to archive tasks');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <FeatureLayout breadcrumbItems={[
      { label: 'Settings', href: '/settings' },
      { label: 'Data Privacy', href: '/settings/data-privacy' },
      { label: 'Bulk Operations' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">Bulk Data Management</h1>
              <p className="text-gray-400">
                Efficiently manage large amounts of data with bulk delete and archive operations. Use these tools to clean up old data and reduce storage.
              </p>
            </div>
          </div>
        </div>

        {/* Bulk Delete Expenses */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-1">Bulk Delete Expenses</h2>
              <p className="text-sm text-gray-400">
                Delete multiple expenses within a specific date range
              </p>
            </div>
          </div>

          {deleteSuccess && (
            <div className="mb-4 p-4 bg-green-900/20 border border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200">
                <p className="font-medium">Expenses deleted successfully!</p>
                <p className="text-xs mt-1">The selected expenses have been permanently removed.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {deleteCount !== null && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium">Ready to delete {deleteCount} expenses</p>
                    <p className="text-xs mt-1">This action cannot be undone. Make sure you&apos;ve exported any data you want to keep.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGetDeleteCount}
                disabled={!deleteStartDate || !deleteEndDate}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Preview Count
              </button>
              {deleteCount !== null && deleteCount > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete {deleteCount} Expenses
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Archive Tasks */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-1">Archive Old Tasks</h2>
              <p className="text-sm text-gray-400">
                Archive completed tasks older than a specific date to reduce clutter
              </p>
            </div>
          </div>

          {archiveSuccess && (
            <div className="mb-4 p-4 bg-green-900/20 border border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200">
                <p className="font-medium">Tasks archived successfully!</p>
                <p className="text-xs mt-1">{archiveCount} tasks have been moved to the archive.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Archive tasks completed before
              </label>
              <input
                type="date"
                value={archiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium">About Archiving</p>
                  <p className="text-xs mt-1">Archived tasks are still accessible but won&apos;t appear in your default task views. This helps keep your active task list focused while preserving historical data.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleBulkArchive}
              disabled={!archiveDate || isArchiving}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isArchiving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Archive Old Tasks
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-200">
              <p className="font-medium mb-1">GDPR Data Minimization</p>
              <p className="text-xs">
                These tools help you comply with GDPR Article 5(1)(c) by minimizing the amount of personal data you actively process. Always export important data before performing bulk deletions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
