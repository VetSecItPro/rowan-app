'use client';

import { useState } from 'react';
import { CheckCircle2, Trash2, UserPlus, Flag, Tag, Download, X, ChevronDown } from 'lucide-react';
import { remindersBulkService } from '@/lib/services/reminders-bulk-service';
import { Reminder } from '@/lib/services/reminders-service';
import { logger } from '@/lib/logger';

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedReminders: Reminder[];
  onClearSelection: () => void;
  onComplete: () => void;
  spaceId: string;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedReminders,
  onClearSelection,
  onComplete,
  spaceId,
}: BulkActionsToolbarProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleBulkComplete = async () => {
    setIsProcessing(true);
    try {
      const result = await remindersBulkService.completeReminders(
        selectedReminders.map((r) => r.id)
      );
      if (result.success) {
        onComplete();
        setShowCompleteConfirm(false);
      } else {
        alert(`Completed ${result.successCount}, failed ${result.failedCount}`);
      }
    } catch (error) {
      logger.error('Bulk complete failed:', error, { component: 'BulkActionsToolbar', action: 'component_action' });
      alert('Failed to complete reminders');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const result = await remindersBulkService.deleteReminders(
        selectedReminders.map((r) => r.id)
      );
      if (result.success) {
        onComplete();
        setShowDeleteConfirm(false);
      } else {
        alert(`Deleted ${result.successCount}, failed ${result.failedCount}`);
      }
    } catch (error) {
      logger.error('Bulk delete failed:', error, { component: 'BulkActionsToolbar', action: 'component_action' });
      alert('Failed to delete reminders');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePriority = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    setIsProcessing(true);
    try {
      const result = await remindersBulkService.changePriority(
        selectedReminders.map((r) => r.id),
        priority
      );
      if (result.success) {
        onComplete();
      } else {
        alert(`Updated ${result.successCount}, failed ${result.failedCount}`);
      }
    } catch (error) {
      logger.error('Bulk priority change failed:', error, { component: 'BulkActionsToolbar', action: 'component_action' });
      alert('Failed to change priority');
    } finally {
      setIsProcessing(false);
      setShowPriorityMenu(false);
    }
  };

  const handleChangeCategory = async (
    category: 'bills' | 'health' | 'work' | 'personal' | 'household'
  ) => {
    setIsProcessing(true);
    try {
      const result = await remindersBulkService.changeCategory(
        selectedReminders.map((r) => r.id),
        category
      );
      if (result.success) {
        onComplete();
      } else {
        alert(`Updated ${result.successCount}, failed ${result.failedCount}`);
      }
    } catch (error) {
      logger.error('Bulk category change failed:', error, { component: 'BulkActionsToolbar', action: 'component_action' });
      alert('Failed to change category');
    } finally {
      setIsProcessing(false);
      setShowCategoryMenu(false);
    }
  };

  const handleExportJSON = () => {
    const json = remindersBulkService.exportToJSON(selectedReminders);
    remindersBulkService.downloadFile(
      json,
      `reminders-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  const handleExportCSV = () => {
    const csv = remindersBulkService.exportToCSV(selectedReminders);
    remindersBulkService.downloadFile(
      csv,
      `reminders-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 pb-safe">
        <div className="bg-gray-800 border-2 border-blue-600 rounded-xl shadow-2xl p-4 flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Selection Count */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 rounded-lg">
            <span className="text-sm font-semibold text-blue-300">
              {selectedCount} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Complete */}
          <button
            onClick={() => setShowCompleteConfirm(true)}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 text-green-300 rounded-lg hover:bg-green-900/50 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Complete</span>
          </button>

          {/* Priority */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg hover:bg-blue-900/50 transition-colors disabled:opacity-50"
            >
              <Flag className="w-4 h-4" />
              <span className="text-sm font-medium">Priority</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showPriorityMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPriorityMenu(false)}
                />
                <div className="absolute bottom-full mb-2 left-0 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleChangePriority(priority)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize transition-colors"
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Category */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-lg hover:bg-purple-900/50 transition-colors disabled:opacity-50"
            >
              <Tag className="w-4 h-4" />
              <span className="text-sm font-medium">Category</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showCategoryMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCategoryMenu(false)}
                />
                <div className="absolute bottom-full mb-2 left-0 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                  {(['bills', 'health', 'work', 'personal', 'household'] as const).map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => handleChangeCategory(category)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize transition-colors"
                      >
                        {category}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <div className="relative group">
            <button
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 text-amber-300 rounded-lg hover:bg-amber-900/50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <div className="absolute bottom-full mb-2 left-0 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-20">
              <button
                onClick={handleExportJSON}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-t-lg transition-colors"
              >
                JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-b-lg transition-colors"
              >
                CSV
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 text-red-300 rounded-lg hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Delete</span>
          </button>

          {/* Close */}
          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Complete Confirmation Dialog */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCompleteConfirm(false)}
          />
          <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Complete {selectedCount} Reminder{selectedCount > 1 ? 's' : ''}?
            </h3>
            <p className="text-gray-400 mb-6">
              This will mark all selected reminders as completed.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkComplete}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Delete {selectedCount} Reminder{selectedCount > 1 ? 's' : ''}?
            </h3>
            <p className="text-gray-400 mb-6">
              This action cannot be undone. All selected reminders will be permanently deleted.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
