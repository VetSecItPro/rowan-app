'use client';

import { useState } from 'react';
import { CheckCircle, Trash2, User, Tag, AlertCircle, X, MoreHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface BulkActionsBarProps {
  selectedTaskIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionsBar({ selectedTaskIds, onClearSelection, onActionComplete }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedTaskIds.length === 0) return null;

  async function bulkUpdateStatus(status: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', selectedTaskIds);

      if (error) throw error;

      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error updating tasks:', error);
      alert('Failed to update tasks');
    } finally {
      setLoading(false);
    }
  }

  async function bulkUpdatePriority(priority: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ priority, updated_at: new Date().toISOString() })
        .in('id', selectedTaskIds);

      if (error) throw error;

      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error updating tasks:', error);
      alert('Failed to update tasks');
    } finally {
      setLoading(false);
    }
  }

  async function bulkDelete() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', selectedTaskIds);

      if (error) throw error;

      setShowDeleteConfirm(false);
      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      alert('Failed to delete tasks');
    } finally {
      setLoading(false);
    }
  }

  async function bulkComplete() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedTaskIds);

      if (error) throw error;

      onActionComplete();
      onClearSelection();
    } catch (error) {
      console.error('Error completing tasks:', error);
      alert('Failed to complete tasks');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg pb-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={onClearSelection}
                className="btn-touch p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors active:scale-95 rounded"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center gap-3 sm:gap-2">
              {/* Quick Actions */}
              <button
                onClick={bulkComplete}
                disabled={loading}
                className="btn-touch flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors active:scale-95"
                title="Mark as completed"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="btn-touch flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors active:scale-95"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="btn-touch flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-95"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  More
                </button>

                {showMoreActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMoreActions(false)}
                    />
                    <div className="absolute bottom-full mb-2 left-0 w-56 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                      {/* Status Options */}
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                          Set Status
                        </p>
                        <button
                          onClick={() => {
                            bulkUpdateStatus('in-progress');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => {
                            bulkUpdateStatus('blocked');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          Blocked
                        </button>
                        <button
                          onClick={() => {
                            bulkUpdateStatus('on-hold');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          On Hold
                        </button>
                      </div>

                      {/* Priority Options */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                          Set Priority
                        </p>
                        <button
                          onClick={() => {
                            bulkUpdatePriority('urgent');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <AlertCircle className="w-3 h-3 inline mr-2" />
                          Urgent
                        </button>
                        <button
                          onClick={() => {
                            bulkUpdatePriority('high');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <AlertCircle className="w-3 h-3 inline mr-2" />
                          High
                        </button>
                        <button
                          onClick={() => {
                            bulkUpdatePriority('medium');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <AlertCircle className="w-3 h-3 inline mr-2" />
                          Medium
                        </button>
                        <button
                          onClick={() => {
                            bulkUpdatePriority('low');
                            setShowMoreActions(false);
                          }}
                          className="btn-touch w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <AlertCircle className="w-3 h-3 inline mr-2" />
                          Low
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? 'Processing...' : 'Select tasks to perform bulk actions'}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={bulkDelete}
        title="Delete Tasks"
        message={`Are you sure you want to delete ${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        confirmLoading={loading}
      />
    </div>
  );
}
